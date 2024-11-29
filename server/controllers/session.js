const { startSession, endSession, getSession } = require("../connection");

module.exports = {
  get: {
    status: async (req, res) => {
      const { sessionId } = req.params;
      try {
        const session = await getSession(sessionId);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }
        res
          .status(200)
          .json({ message: "Session found", sessionId, status: "active" });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ message: "Error fetching session status", error });
      }
    },
  },
  create: {
    session: async (req, res) => {
      const { sessionId } = req.body;
      try {
        const { qrImage } = await startSession(sessionId);
        res
          .status(201)
          .json({ message: "Session started", sessionId, qrImage });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to start session", error });
      }
    },
  },
  disconnect: async (req, res) => {
    const { sessionId } = req.body;
    try {
      const response = await endSession(sessionId);
      res.status(201).json({
        message: response.message,
        sessionId,
        success: response.success,
      });
    } catch (error) {
      console.error("Error Disconnect");
      res.status(500).json({ message: "Failed to start session", error });
    }
  },
};
