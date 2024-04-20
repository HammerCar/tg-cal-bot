import { z } from "zod";

export const tgAuthData = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  username: z.string(),
  photo_url: z.string().url(),
  auth_date: z.string(),
  hash: z.string(),
});

export default tgAuthData;
