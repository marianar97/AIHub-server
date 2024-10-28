const { z } = require("zod");

const urlSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

module.exports = { urlSchema };
