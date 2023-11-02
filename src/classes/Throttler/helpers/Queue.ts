export class Queue<T> {
  queue: T[] = []

  // Adds a value to the queue
  enqueue(value: T) {
    this.queue.push(value)
    return this.queue.length
  }

  dequeue(): T | undefined {
    if (this.queue.length === 0) {
      return
    }

    const output = this.queue[0]
    this.queue = this.queue.slice(1)
    return output
  }

  size() {
    return this.queue.length
  }

  findItemIndex(predicate: (val: T) => boolean) {
    return this.queue.findIndex(predicate)
  }

  updateIndex(index: number, newValue: any) {
    if (this.queue[index] === undefined) {
      throw new Error(`Cannot update nonexisting value at ${index}`)
    }

    this.queue[index] = newValue
  }
}
