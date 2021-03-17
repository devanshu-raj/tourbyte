import axios from 'axios';
import { showAlert } from './alerts';

export const signup = async (name, email, password, passwordConfirm) => {
  console.log(name, email, password, passwordConfirm);
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === 'success') {
      showAlert(
        'success',
        `Registered Successfully! Welcome ${name}. Please Check your email for confirmation.`
      );
      window.setTimeout(() => {
        location.assign('/');
      }, 2500);
    }
  } catch (err) {
    return showAlert('error', err.response.data.message);
  }
};
