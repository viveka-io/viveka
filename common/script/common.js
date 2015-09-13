/*global io*/
const socket = io.connect('ws://localhost:5555');

export function emitOnSocket(message, data) {
    return new Promise(resolve => {
        socket.emit(message, data, result => resolve(result));
    });
}
