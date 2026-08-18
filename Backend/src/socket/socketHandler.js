const socketHandler = (io) => {
  // Track connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate and join rooms
    socket.on('authenticate', ({ userId, role, region, department }) => {
      if (!userId) return;

      connectedUsers.set(socket.id, { userId, role, region, department });

      // Join personal room
      socket.join(`user_${userId}`);
      socket.join(`citizen_${userId}`);

      // Join role & regional department rooms
      if (role === 'admin') {
        socket.join('admin');
      } else if (role === 'officer') {
        if (region) {
          socket.join(`region_${region}`);
          socket.join(`officer_${region}`);
        }
        if (region && department) {
          const deptKey = department.replace(/[^a-zA-Z0-9]/g, '_');
          socket.join(`dept_${region}_${deptKey}`);
          console.log(`Officer ${userId} joined room dept_${region}_${deptKey}`);
        }
        socket.join(`officer_${userId}`);
      } else if (role === 'citizen') {
        if (region) {
          socket.join(`region_${region}_citizen`);
        }
      }

      socket.emit('authenticated', { status: 'connected', rooms: [`user_${userId}`] });
      console.log(`User ${userId} (${role}) joined rooms [region: ${region}, dept: ${department}]`);
    });

    // Officer joins specific complaint room for live updates
    socket.on('join_complaint', ({ complaintId }) => {
      socket.join(`complaint_${complaintId}`);
    });

    socket.on('leave_complaint', ({ complaintId }) => {
      socket.leave(`complaint_${complaintId}`);
    });

    // Typing indicator for officer-citizen communication
    socket.on('typing', ({ complaintId, userName }) => {
      socket.to(`complaint_${complaintId}`).emit('user_typing', { userName });
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log(`Socket disconnected: ${socket.id}`);
    });

    // Ping/pong for connection health
    socket.on('ping', () => socket.emit('pong'));
  });

  return io;
};

module.exports = socketHandler;
