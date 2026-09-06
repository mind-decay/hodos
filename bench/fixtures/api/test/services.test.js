import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { AppError } from '../src/errors.js';
import { create, get, list } from '../src/services/orders.js';
import { reset } from '../src/store/orders.js';

beforeEach(reset);

/** @param {string} code */
const codeIs = (code) => /** @param {unknown} error */ (error) =>
  error instanceof AppError && error.code === code;

describe('the orders service', () => {
  it('lists every order when no status is asked for', () => {
    assert.equal(list(null).length, 3);
  });

  it('filters by status', () => {
    assert.deepEqual(
      list('paid').map((order) => order.id),
      ['o-2'],
    );
  });

  it('rejects a status outside the three with a 400 AppError', () => {
    assert.throws(() => list('archived'), (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'invalid_status');
      assert.equal(error.status, 400);
      return true;
    });
  });

  it('reports a missing order as not_found', () => {
    assert.throws(
      () => get('o-99'),
      /** @param {unknown} error */ (error) => error instanceof AppError && error.status === 404,
    );
  });

  it('creates an order and gives it the open status', () => {
    const created = create({ customer: 'Barbara', total: 7 });
    assert.equal(created.status, 'open');
    assert.equal(get(created.id).customer, 'Barbara');
  });

  it('rejects a body whose fields are the wrong shape', () => {
    assert.throws(() => create({ customer: '', total: 7 }), codeIs('invalid_customer'));
    assert.throws(() => create({ customer: 'Ada', total: -1 }), codeIs('invalid_total'));
    assert.throws(() => create('nope'), codeIs('invalid_body'));
  });
});
