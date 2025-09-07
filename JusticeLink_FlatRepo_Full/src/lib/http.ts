
import axios from "axios";
import axiosRetry from "axios-retry";
import Bottleneck from "bottleneck";

export const http = axios.create({
  timeout: 12000,
  headers: { "User-Agent": "JusticeLinkBot/1.0 (+contact: ops@yourdomain.com)" },
  validateStatus: (s) => s >= 200 && s < 400
});
axiosRetry(http, { retries: 2, retryDelay: axiosRetry.exponentialDelay });
export const limiter = new Bottleneck({ minTime: 500, maxConcurrent: 2 });
