module.exports = {
  removeSuffixID: (participantId) => {
    if (participantId) {
      return participantId.replace(/:\d+@/, "@");
    }
    return "";
  },
};
