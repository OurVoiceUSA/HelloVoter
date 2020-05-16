import fetchMock from 'fetch-mock';

var mockOK = () => {
  return {
    status: 200,
    headers: {
      'x-sm-oauth-url': 'https://ws.ourvoiceusa.org/auth',
  }};
};

fetchMock.mock('https://gotv.ourvoiceusa.org/api/v1/hello', mockOK);
fetchMock.mock('https://gotv.ourvoiceusa.org/auth', mockOK);

