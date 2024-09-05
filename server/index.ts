import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { main } from './src/lib/ws'
const fastify = Fastify({
    logger: true,
})

fastify.register(websocket)

//   socket.on('message', message => {
//     const messageString = message.toString()
//     console.log('Received:', messageString)
    
//     if (messageString.toLowerCase() === 'ping') {
//       socket.send('pong')
//     }
//   })
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket) => {
        // socket.on('new-client', () => socket.send('new-client event!'))
        socket.on('connection', () => console.log('Client connected.'))
        socket.on('message', main(socket))
        // socket.on('')
    })
})

fastify.listen({
    port: 3000
})