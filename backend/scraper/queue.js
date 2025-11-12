/**
 * Request queue to handle Browserless concurrency limits
 * Free tier allows only 1 concurrent browser
 * This ensures requests are processed sequentially
 */

class RequestQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Execute function with queue management
   * Waits if concurrency limit reached
   */
  async run(fn, context = 'request') {
    // If under concurrency limit, execute immediately
    if (this.running < this.concurrency) {
      return this._execute(fn, context);
    }

    // Otherwise, queue and wait
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, context, resolve, reject });
    });
  }

  async _execute(fn, context) {
    this.running++;
    const startTime = Date.now();

    try {
      console.log(`[Queue] Executing: ${context} (${this.running}/${this.concurrency})`);
      const result = await fn();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Queue] Completed: ${context} in ${duration}s`);
      return result;
    } finally {
      this.running--;
      this._processQueue();
    }
  }

  _processQueue() {
    if (this.queue.length === 0 || this.running >= this.concurrency) {
      return;
    }

    const { fn, context, resolve, reject } = this.queue.shift();
    this._execute(fn, context)
      .then(resolve)
      .catch(reject);
  }

  status() {
    return {
      running: this.running,
      queued: this.queue.length,
      capacity: this.concurrency
    };
  }
}

// Global queue instance (1 concurrent Browserless request)
const browserlessQueue = new RequestQueue(1);

export { browserlessQueue };
