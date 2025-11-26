import Cookies from "js-cookie"


export const BASE_URL_W3 = "https://www.w3era.com/api/";
export const BASE_URL_WR = "https://dashboard.wranker.com/api/";
export const BASE_URL_ONPAGE="https://onpageinsights.com/api/"

export const token = Cookies.get("login_access_token_wrank")
