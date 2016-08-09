import { spy } from 'sinon';
import { assert } from 'chai';

import Updater from '../src/Updater';
import * as Actions from '../src/actions';

const MockSagaAbstraction = 'Mock';

function* emptySaga() { } // eslint-disable-line no-empty-function

describe('Updater', () => {
  let sagaRepository;
  let effectExecutor;
  let spiedDispatch;

  beforeEach(() => {
    spiedDispatch = spy();
    effectExecutor = spy(cb => cb(spiedDispatch));
    sagaRepository = {
      mount: spy(),
      unmount: spy(),
      dispatch: spy()
    };
  });

  it('should mount the saga in saga repository after Component mounts', () => {
    const updater = new Updater(0, emptySaga);
    const reducer = updater.toReducer();

    reducer(0, {
      type: Actions.Mount,
      effectExecutor,
      sagaRepository
    });

    assert.isFalse(sagaRepository.unmount.called);
    assert.isTrue(sagaRepository.mount.called);
    assert.equal(sagaRepository.mount.firstCall.args[2], emptySaga);
  });

  it('should allow to specify saga abstraction to be used', () => {
    const updater = new Updater(0, emptySaga, null, MockSagaAbstraction);
    const reducer = updater.toReducer();

    reducer(0, {
      type: Actions.Mount,
      effectExecutor,
      sagaRepository
    });

    assert.equal(sagaRepository.mount.firstCall.args[0], MockSagaAbstraction);
  });

  it('should allow to specify different default matcher', () => {
    const fooMatcher = () => action => {
      if (action.type === 'Foo') {
        return {
          id: 'Foo',
          unwrappedType: 'Foo',
          wrap: type => type,
          args: {
            magicConst: 42
          }
        };
      } else {
        return false;
      }
    };

    const actionHandlerSpy = spy();
    const updater = new Updater(0, undefined, fooMatcher)
      .case('whatever', actionHandlerSpy);
    const reducer = updater.toReducer();

    reducer(0, {
      type: 'nothing'
    });
    reducer(0, {
      type: 'Foo'
    });

    assert.equal(actionHandlerSpy.callCount, 1);
    assert.equal(actionHandlerSpy.firstCall.args[1].matching.args.magicConst, 42);
  });

  it('should pass the input action to saga repository', () => {
    const updater = new Updater(0, emptySaga);
    const reducer = updater.toReducer();

    reducer(0, {
      type: 'Foo',
      effectExecutor,
      sagaRepository
    });

    assert.deepEqual(sagaRepository.dispatch.firstCall.args[2], {
      type: 'Foo',
      effectExecutor,
      sagaRepository
    });
  });

  it('should provide mutated model when action is being passed to saga repo', () => {
    const updater = new Updater(0, emptySaga)
      .case('Foo', () => 42);
    const reducer = updater.toReducer();

    reducer(0, {
      type: 'Foo',
      effectExecutor,
      sagaRepository
    });

    assert.equal(sagaRepository.dispatch.firstCall.args[1], 42);
  });

  it('should treat matching id as saga id', () => {
    const updater = new Updater(0, emptySaga);
    const reducer = updater.toReducer();

    reducer(0, {
      type: 'Foo',
      effectExecutor,
      sagaRepository,
      matching: {
        id: 'SagaId'
      }
    });

    assert.equal(sagaRepository.dispatch.firstCall.args[0], 'SagaId');
  });

  it('should ignore sagas lifecycle when no effectExecutor nor sagaRepository is provided', () => {
    const updater = new Updater(0, emptySaga);
    const reducer = updater
      .case('Foo', () => 42)
      .toReducer();

    const reduction = reducer(0, {
      type: 'Foo'
    });

    assert.equal(reduction, 42);
    assert.isFalse(effectExecutor.called);
  });
});
