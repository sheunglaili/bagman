export function wait(fn: (done: (value: unknown) => void) => any) {
    return new Promise((done) => fn(done));
}