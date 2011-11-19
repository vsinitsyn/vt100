md5 = require 'crypto/md5'

userDb =
  'val':
    userName: 'val',
    fullName: 'Valentine Sinitsyn',
    shell: '/bin/bash',
    _pw_hash: '8fe4c11451281c094a6578e6ddbf5eed',

exports.getUser = (login, password) ->
  userDb[login] if login != '' and userDb[login] and userDb[login]._pw_hash == md5.hex_md5(password)
