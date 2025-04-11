
export const UrlConstants= {
  login: `http://${process.env.HOST_NAME}/login`,
  loginCallback: `http://${process.env.HOST_NAME}/login/callback`,

  logout: `http://${process.env.HOST_NAME}/logout`,
  logoutCallback: `http://${process.env.HOST_NAME}/logout/callback`,

  issuer: process.env.ISSUER_URL,

  frontendLoginSuccess: process.env.LOGIN_URL,
  frontendLogoutSuccess: process.env.LOGOUT_URL,
  frontendError: type => `${process.env.ERROR_URL}?${type}`
};
