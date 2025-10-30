const slaveGuard = require('../src/middleware/slaveGuard');

describe('slaveGuard middleware', () => {
  const OLD_ROLE = process.env.ROLE;

  afterEach(() => {
    process.env.ROLE = OLD_ROLE;
  });

  test('blocks POST when ROLE=slave', () => {
    process.env.ROLE = 'slave';

    const req = { method: 'POST', path: '/api/v1/usuarios' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    slaveGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test('allows GET when ROLE=slave', () => {
    process.env.ROLE = 'slave';

    const req = { method: 'GET', path: '/api/v1/usuarios' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    slaveGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('does not block POST when ROLE=master', () => {
    process.env.ROLE = 'master';

    const req = { method: 'POST', path: '/api/v1/usuarios' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    slaveGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
