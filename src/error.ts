export class OperationError extends Error { 
    constructor(msg: string) {
        super(msg);
    }
}