import { flagIsSet } from '../../common/index.js';

const publicProtocol= flagIsSet('PUBLIC_HTTPS') ? 'https' : 'http';

export const UrlConstants= {
  login: `${publicProtocol}://${process.env.HOST_NAME}/login`,
  loginFilter: `${publicProtocol}://${process.env.HOST_NAME}/login/filter`,
  loginCallback: `${publicProtocol}://${process.env.HOST_NAME}/login/callback`,

  logout: `${publicProtocol}://${process.env.HOST_NAME}/logout`,
  logoutCallback: `${publicProtocol}://${process.env.HOST_NAME}/logout/callback`,

  issuer: process.env.ISSUER_URL,

  frontendLoginSuccess: process.env.LOGIN_URL,
  frontendLogoutSuccess: process.env.LOGOUT_URL,
  frontendError: type => `${process.env.ERROR_URL}?${type}`
};
