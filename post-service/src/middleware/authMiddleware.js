const logger = require("./../utils/logger");

const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn(`Accesss attempted without userId`);
    return res.status(401).send({
      success: false,
      message: "Authentication required! Please login to continue",
    });
  }

  req.user = {
    userId,
  };

  next();
};

module.exports = authenticateRequest;
