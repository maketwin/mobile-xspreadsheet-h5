/* global window */
export function bind(target, name, fn, options) {
  target.addEventListener(name, fn, options);
}
export function unbind(target, name, fn) {
  target.removeEventListener(name, fn);
}
export function unbindClickoutside(el) {
  if (el.xclickoutside) {
    unbind(window.document.body, 'click', el.xclickoutside);
    delete el.xclickoutside;
  }
}

// the left mouse button: mousedown → mouseup → click
// the right mouse button: mousedown → contenxtmenu → mouseup
// the right mouse button in firefox(>65.0): mousedown → contenxtmenu → mouseup → click on window
export function bindClickoutside(el, cb) {
  el.xclickoutside = (evt) => {
    // ignore double click
    // console.log('evt:', evt);
    if (evt.detail === 2 || el.contains(evt.target)) return;
    if (cb) cb(el);
    else {
      el.hide();
      unbindClickoutside(el);
    }
  };
  bind(window.document.body, 'click', el.xclickoutside);
}
export function mouseMoveUp(target, movefunc, upfunc) {
  bind(target, 'mousemove', movefunc);
  const t = target;
  t.xEvtUp = (evt) => {
    // console.log('mouseup>>>');
    unbind(target, 'mousemove', movefunc);
    unbind(target, 'mouseup', target.xEvtUp);
    upfunc(evt);
  };
  bind(target, 'mouseup', target.xEvtUp);
}

function calTouchDirection(spanx, spany, evt, cb) {
  let direction = '';
  // console.log('spanx:', spanx, ', spany:', spany);
  if (Math.abs(spanx) > Math.abs(spany)) {
    // horizontal
    direction = spanx > 0 ? 'right' : 'left';
    cb(direction, spanx, evt);
  } else {
    // vertical
    direction = spany > 0 ? 'down' : 'up';
    cb(direction, spany, evt);
  }
}
// cb = (direction, distance) => {}
export function bindTouch(target, {
  start,
  move,
  end,
  shouldPreventDefault = true,
}) {
  let startx = 0;
  let starty = 0;
  let tracking = false;
  bind(target, 'touchstart', (evt) => {
    if (evt.touches.length !== 1) {
      tracking = false;
      return;
    }
    const { pageX, pageY } = evt.touches[0];
    startx = pageX;
    starty = pageY;
    tracking = true;
    if (start) start(evt);
  }, { passive: true });
  bind(target, 'touchmove', (evt) => {
    if (!move || !tracking || evt.touches.length !== 1) return;
    const { pageX, pageY } = evt.touches[0];
    const spanx = pageX - startx;
    const spany = pageY - starty;
    if (Math.abs(spanx) > 10 || Math.abs(spany) > 10) {
      // console.log('spanx:', spanx, ', spany:', spany);
      calTouchDirection(spanx, spany, evt, move);
      startx = pageX;
      starty = pageY;
    }
    if (shouldPreventDefault) evt.preventDefault();
  }, { passive: !shouldPreventDefault });
  bind(target, 'touchend', (evt) => {
    if (!end || !tracking) return;
    tracking = false;
    const { pageX, pageY } = evt.changedTouches[0];
    const spanx = pageX - startx;
    const spany = pageY - starty;
    calTouchDirection(spanx, spany, evt, end);
  }, { passive: true });
  bind(target, 'touchcancel', () => {
    tracking = false;
  }, { passive: true });
}

// eventemiter
export function createEventEmitter() {
  const listeners = new Map();

  function on(eventName, callback) {
    const push = () => {
      const currentListener = listeners.get(eventName);
      return (Array.isArray(currentListener)
          && currentListener.push(callback))
          || false;
    };

    const create = () => listeners.set(eventName, [].concat(callback));

    return (listeners.has(eventName)
        && push())
        || create();
  }

  function fire(eventName, args) {
    const exec = () => {
      const currentListener = listeners.get(eventName);
      for (const callback of currentListener) callback.call(null, ...args);
    };

    return listeners.has(eventName)
        && exec();
  }

  function removeListener(eventName, callback) {
    const remove = () => {
      const currentListener = listeners.get(eventName);
      const idx = currentListener.indexOf(callback);
      return (idx >= 0)
          && currentListener.splice(idx, 1)
          && listeners.get(eventName).length === 0
          && listeners.delete(eventName);
    };

    return listeners.has(eventName)
        && remove();
  }

  function once(eventName, callback) {
    const execCalllback = (...args) => {
      callback.call(null, ...args);
      removeListener(eventName, execCalllback);
    };

    return on(eventName, execCalllback);
  }

  function removeAllListeners() {
    listeners.clear();
  }

  return {
    get current() {
      return listeners;
    },
    on,
    once,
    fire,
    removeListener,
    removeAllListeners,
  };
}
