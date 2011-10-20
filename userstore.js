var md5 = require('crypto/md5');

const userDb = {
  'val': {
    userName: 'val',
    fullName: 'Valentine Sinitsyn',
    shell: '/bin/bash',
    _pw_hash: '8fe4c11451281c094a6578e6ddbf5eed',
  },
};

exports.getUser = function (login, password) {
  console.log(md5.hex_md5(password));
  if (login != '' && userDb[login] && userDb[login]._pw_hash == md5.hex_md5(password)) {
    return userDb[login];
  } else {
    return null;
  }
}
