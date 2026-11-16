import { tokenize, vectorize } from './text';

export interface IntentTrainingExample {
  id: string;
  patterns: string[];
}

export interface ClassificationPrediction {
  label: string;
  confidence: number;
  runnerUpLabel: string;
  runnerUpConfidence: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function relu(value: number): number {
  return value > 0 ? value : 0;
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((acc, v) => acc + v, 0) || 1;
  return exps.map((v) => v / sum);
}

/**
 * First-party multi-layer perceptron intent router trained deterministically
 * over curated developer & conversational intents.
 */
export class ElaraIntentNetwork {
  readonly labels: string[];
  readonly vocabularyIndex: Map<string, number>;
  private readonly inputSize: number;
  private readonly hiddenSize: number;
  private readonly outputSize: number;
  private w1: number[][];
  private b1: number[];
  private w2: number[][];
  private b2: number[];

  constructor(vocabulary: string[], labels: string[], hiddenSize = 64, seed = 20261115) {
    this.labels = labels;
    this.vocabularyIndex = new Map(vocabulary.map((term, idx) => [term, idx]));
    this.inputSize = vocabulary.length;
    this.hiddenSize = hiddenSize;
    this.outputSize = labels.length;

    const rng = seededRandom(seed);
    const scale1 = Math.sqrt(2 / Math.max(1, this.inputSize));
    const scale2 = Math.sqrt(2 / Math.max(1, this.hiddenSize));

    this.w1 = Array.from({ length: hiddenSize }, () =>
      Array.from({ length: this.inputSize }, () => (rng() * 2 - 1) * scale1),
    );
    this.b1 = new Array<number>(hiddenSize).fill(0);
    this.w2 = Array.from({ length: this.outputSize }, () =>
      Array.from({ length: hiddenSize }, () => (rng() * 2 - 1) * scale2),
    );
    this.b2 = new Array<number>(this.outputSize).fill(0);
  }

  private forward(input: number[]) {
    const active: number[] = [];
    for (let i = 0; i < input.length; i += 1) {
      if (input[i] !== 0) active.push(i);
    }

    const hiddenRaw = new Array<number>(this.hiddenSize);
    const hidden = new Array<number>(this.hiddenSize);
    for (let h = 0; h < this.hiddenSize; h += 1) {
      let sum = this.b1[h];
      const row = this.w1[h];
      for (const idx of active) sum += row[idx] * input[idx];
      hiddenRaw[h] = sum;
      hidden[h] = relu(sum);
    }

    const logits = new Array<number>(this.outputSize);
    for (let o = 0; o < this.outputSize; o += 1) {
      let sum = this.b2[o];
      const row = this.w2[o];
      for (let h = 0; h < this.hiddenSize; h += 1) sum += row[h] * hidden[h];
      logits[o] = sum;
    }

    return { active, hiddenRaw, hidden, probs: softmax(logits) };
  }

  train(samples: Array<{ input: number[]; labelIndex: number }>, epochs = 110, lr = 0.09, l2 = 1e-4) {
    for (let epoch = 0; epoch < epochs; epoch += 1) {
      for (const sample of samples) {
        const { active, hiddenRaw, hidden, probs } = this.forward(sample.input);

        const dOut = probs.slice();
        dOut[sample.labelIndex] -= 1;

        const dHidden = new Array<number>(this.hiddenSize).fill(0);
        for (let o = 0; o < this.outputSize; o += 1) {
          const gradO = dOut[o];
          this.b2[o] -= lr * gradO;
          const row = this.w2[o];
          for (let h = 0; h < this.hiddenSize; h += 1) {
            dHidden[h] += gradO * row[h];
            row[h] -= lr * (gradO * hidden[h] + l2 * row[h]);
          }
        }

        for (let h = 0; h < this.hiddenSize; h += 1) {
          if (hiddenRaw[h] <= 0) continue;
          const gradH = dHidden[h];
          this.b1[h] -= lr * gradH;
          const row = this.w1[h];
          for (const idx of active) {
            row[idx] -= lr * (gradH * sample.input[idx] + l2 * row[idx]);
          }
        }
      }
    }
  }

  predict(text: string): ClassificationPrediction {
    const tokens = tokenize(text);
    if (tokens.length === 0) {
      return {
        label: '__unknown__',
        confidence: 0,
        runnerUpLabel: '__unknown__',
        runnerUpConfidence: 0,
      };
    }

    const input = vectorize(tokens, this.vocabularyIndex);
    const hasOverlap = input.some((v) => v !== 0);
    if (!hasOverlap) {
      return {
        label: '__unknown__',
        confidence: 0,
        runnerUpLabel: '__unknown__',
        runnerUpConfidence: 0,
      };
    }

    const { probs } = this.forward(input);
    const ranked = probs
      .map((confidence, idx) => ({ label: this.labels[idx] || '__unknown__', confidence }))
      .sort((a, b) => b.confidence - a.confidence);

    return {
      label: ranked[0]?.label ?? '__unknown__',
      confidence: ranked[0]?.confidence ?? 0,
      runnerUpLabel: ranked[1]?.label ?? '__unknown__',
      runnerUpConfidence: ranked[1]?.confidence ?? 0,
    };
  }
}

export function buildTrainedIntentNetwork(intents: IntentTrainingExample[]): ElaraIntentNetwork {
  const vocabSet = new Set<string>();
  const labels = intents.map((i) => i.id);
  const tokenizedSamples: Array<{ tokens: string[]; labelIndex: number }> = [];

  intents.forEach((intent, labelIndex) => {
    for (const pattern of intent.patterns) {
      const tokens = tokenize(pattern);
      tokens.forEach((t) => vocabSet.add(t));
      tokenizedSamples.push({ tokens, labelIndex });
    }
  });

  const vocabulary = Array.from(vocabSet).sort();
  const net = new ElaraIntentNetwork(vocabulary, labels);
  const vectors = tokenizedSamples.map((s) => ({
    input: vectorize(s.tokens, net.vocabularyIndex),
    labelIndex: s.labelIndex,
  }));

  net.train(vectors);
  return net;
}
