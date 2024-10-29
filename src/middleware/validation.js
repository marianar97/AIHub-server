const { z } = require("zod");

const urlSchema = z.object({
  url: z.string().url("Invalid URL format"),
  tags: z.array(z.string()).optional().default([]),
});

module.exports = { urlSchema };
