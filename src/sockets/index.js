import { addUser, removeUser, getUser, getUsersInRoom}  from '../sockets/user'

const allowedOrigins = ['https://carryhome.in']

const sockets = async (io) => {
  // io.origins(allowedOrigins)
  // io.origins((origin, callback) => {
  //   return callback(null, true)
  // })


  await io.on('connection', async (socket) => { 
    let randomNo = Math.floor(Math.random()*(999-100+1)+100)
    console.log('connected')
  
    socket.on('join', ({ name = 'anonimas_'+randomNo, room = 'carryhome' }, callback) => {
      const { error, user } = addUser({ id: socket.id, name, room })
      if(error) return callback(error)
      socket.join(user.room)
      socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`})
      socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` })
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) })
      callback()
    })

    socket.on('sendMessage', (message, callback) => {
      const user = getUser(socket.id)
      io.to(user.room).emit('message', { user: user.name, text: message })
      callback()
    })
  
    
    await socket.on('reconnect_attempt', () => {
      socket.io.opts.transports = ['polling', 'websocket']
    })

    await socket.on('typing', (data) => {  
      const { userId, fullName,room,hasStoppedTyping, key} = data 
      const typingMsg = userId ? fullName + ' is typing' : ''
      const response = !hasStoppedTyping ? {typingMsg, userId, key} : {}
      io.to(room).emit('typing', response)
    })

    await socket.on('stoppedTyping', (data) => {
      const { room } = data
      io.to(room).emit('typing', {})
    })

    await socket.on('disconnect', () => {
      const user = removeUser(socket.id)
      if(user) {
        io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` })
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)})
      }
    })
  })
}

export default sockets
