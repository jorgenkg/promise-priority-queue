export type BucketQueueEntry<T = any> = {
  resolve: (taskResult: T) => void;
  reject: (error: Error) => void;
  task: () => Promise<T>;
};
