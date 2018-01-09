(function(){
"use strict";

const STATE = {
  // cnv
  // ctx
  // screenWide
  // screenHigh
  // drawRequested

  // disableTouch
  // touchStarted
  // prevTouch
  // touchAt
  // dragging
  // holdTimeout
  
  // pinchStarted
  // prevPinch
  // pinchAt

  // panX
  // panY
  // zoom
  // tempPanX
  // tempPanY
  // tempZoom

  // hotspots
  // drawables
  // menu
  // draggingObj
  // selectedCircle
  // selectedPrune

  // circles
};

const init = function(st) {
  st.cnv = document.getElementById('cnv');
  st.ctx = cnv.getContext('2d');

  st.dpr = 1;
  if (window.devicePixelRatio) {
    st.dpr = window.devicePixelRatio;
  }

  st.drawRequested = false;

  const resize = function() {
    resizeCanvas(st, window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', resize);

  window.addEventListener('focus', resize);

  //
  cnv.addEventListener('mousedown', function mousedown(e) {
    clearHoldTimeout(st);
    if (e.button == 0) {
      if (!st.disableTouch) {
        setupHoldTimeout(st);
        moveTouchTo(st, e.clientX, e.clientY);
      }
      e.preventDefault();
    }
  });
  cnv.addEventListener('touchstart', function touchstart(e) {
    clearHoldTimeout(st);
    if (!st.disableTouch) {
      if (e.touches.length == 2) {
        if (st.touchStarted) {
          cancelTouch(st);
        }
        movePinchTo(st, e.touches[0].clientX, e.touches[0].clientY,
                        e.touches[1].clientX, e.touches[1].clientY);
      } else if (e.touches.length == 1) {
        setupHoldTimeout(st);
        moveTouchTo(st, e.touches[0].clientX, e.touches[0].clientY);
      }
    }
    e.preventDefault();
  });

  cnv.addEventListener('mousemove', function mousemove(e) {
    if (st.touchStarted) {
      moveTouchTo(st, e.clientX, e.clientY);
    }
  });
  cnv.addEventListener('touchmove', function touchmove(e) {
    if (st.touchStarted) {
      moveTouchTo(st, e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
    if (st.pinchStarted) {
      if (e.touches.length == 2) {
        movePinchTo(st, e.touches[0].clientX, e.touches[0].clientY,
                        e.touches[1].clientX, e.touches[1].clientY);
      } else {
        endPinch(st);
      }
    }
    e.preventDefault();
  }, {passive: false});

  cnv.addEventListener('mouseup', function mouseup(e) {
    endTouch(st, e.clientX, e.clientY);
  });
  cnv.addEventListener('mouseout', function mouseup(e) {
    endTouch(st, e.clientX, e.clientY);
  });
  cnv.addEventListener('touchend', function touchend(e) {
    endPinch(st);
    endTouch(st, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    e.preventDefault();
  });
  cnv.addEventListener('touchcancel', function touchcancel(e) {
    endPinch(st);
    cancelTouch(st);
  });
  cnv.addEventListener('wheel', function wheel(e) {
    e.preventDefault();


    let delta = -e.deltaY;

    if (e.deltaMode === 0x01) {
      delta *= 20;
    }
    if (e.deltaMode === 0x02) {
      delta *= 20 * 10;
    }

    mouseWheel(st, e.pageX, e.pageY, delta);

  }, {passive: false});

  st.disableTouch = false;

  resize();
}

const resizeCanvas = function(st, wide, high) {
  st.screenWide = wide;
  st.screenHigh = high;

  st.cnv.width = st.screenWide * st.dpr;
  st.cnv.height = st.screenHigh * st.dpr;

  st.ctx.setTransform(1, 0, 0, 1, 0, 0);
  st.ctx.scale(st.dpr, st.dpr);

  requestDraw(st);
};

const setupHoldTimeout = function(st) {
  if (st.holdTimeout) {
    clearHoldTimeout(st);
  }

  st.holdTimeout = setTimeout(function() {
    cancelTouch(st);
    touchHold(st, st.touchAt.x, st.touchAt.y);
  }, 750);
};

const clearHoldTimeout = function(st) {
  if (st.holdTimeout) {
    clearTimeout(st.holdTimeout);
    st.holdTimeout = null;
  }
};

const moveTouchTo = function(st, x, y) {
  const dragDistance = 10;

  if (!st.touchStarted) {
    st.touchStarted = {x, y};
    st.touchAt = null;
    st.dragging = false;
  }

  st.prevTouch = st.touchAt;
  st.touchAt = {x, y};

  const dx = x - st.touchStarted.x;
  const dy = y - st.touchStarted.y;
  if (!st.dragging && dx * dx + dy * dy > dragDistance * dragDistance) {
    st.dragging = true;
    clearHoldTimeout(st);

    dragStart(st, st.touchStarted.x, st.touchStarted.y);
    drag(st, st.touchStarted.x, st.touchStarted.y, x, y);
  } else if (st.dragging && st.prevTouch) {
    drag(st, st.prevTouch.x, st.prevTouch.y, x, y);
  }

};

const endTouch = function(st, x, y) {
  clearHoldTimeout(st);
  if (st.touchStarted) {
    if (st.dragging) {
      dragEnd(st, x, y);
      st.dragging = false;
    } else {
      click(st, st.touchStarted.x, st.touchStarted.y);
    }
    st.touchStarted = null;
  }
};

const cancelTouch = function(st) {
  clearHoldTimeout(st);
  if (st.touchStarted) {
    if (st.dragging) {
      dragCancel(st);
      st.dragging = false;
    }
    st.touchStarted = null;
  }
};

const movePinchTo = function(st, x1, y1, x2, y2) {
  if (!st.pinchStarted) {
    st.pinchStarted = {x1, y1, x2, y2};
    st.pinchAt = null;
    pinchStart(st);
  }

  st.prevPinch = st.pinchAt;
  st.pinchAt = {x1, y1, x2, y2};

  pinch(st, x1, y1, x2, y2);
};

const endPinch = function(st) {
  if (st.pinchStarted) {
    pinchEnd(st);
    st.pinchStarted = null;
  }
};

const requestDraw = function(st) {
  if (!st.drawRequested) {
    st.drawRequested = true;
    window.requestAnimationFrame(function(t) {
      st.drawRequested = false;
      draw(st, t);
    });
  }
};

//

const drawRoundRect = function(c, x0, y0, x1, y1, r, fill, stroke) {
  if (x0 > x1) {
    const t = x0;
    x0 = x1;
    x1 = t;
  }
  if (y0 > y1) {
    const t = y0;
    y0 = y1;
    y1 = t;
  }


  r = Math.min((x1 - x0) / 2, (y1 - y0) / 2, r);

  c.beginPath();
  c.moveTo(x0 + r, y0);
  c.arcTo(x1, y0, x1, y0 + r, r);
  c.arcTo(x1, y1, x1 - r, y1, r);
  c.arcTo(x0, y1, x0, y1 - r, r);
  c.arcTo(x0, y0, x0 + r, y0, r);

  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }

  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
};

//

const lerp = function(x0, x1, t) {
  return x0 + (x1 - x0) * t;
};

const quadIn = function(t) {
  return (t*t);
};

const quadOut = function(t) {
  return t*(2-t);
};

const quadInOut = function(t) {
  if (t < 0.5) {
    return 2*t*t;
  } else {
    return -1 + 2*t*(2 - t);
  }
};

const updateAnim = function(anim, t, valNames) {
  let cbs = [];
  let curFrame = anim[0];
  let prevFrame = null;
  while (anim.length > 0) {
    if (!curFrame.offsetSet) {
      if (prevFrame) {
        // time is relative to previous frame
        curFrame.t += prevFrame.t;
      } else {
        // otherwise, time is relative to now
        curFrame.t += t;
      }
      curFrame.offsetSet = true;
    }

    if (t < curFrame.t) {
      break;
    }

    if (curFrame.cb) {
      cbs.push(curFrame.cb);
      curFrame.cb = null;
    }
    prevFrame = anim.shift();
    curFrame = anim[0];
  }

  const vals = {cbs};

  if (!curFrame && prevFrame) {
    // past the last keyframe, just use it directly
    valNames.forEach(n => vals[n] = prevFrame[n]);
  } else if (curFrame && prevFrame) {
    // two keyframes to lerp between
    let tt = (t - prevFrame.t) / (curFrame.t - prevFrame.t);
    if (curFrame.f) {
      tt = curFrame.f(tt);
    }

    valNames.forEach(n => vals[n] = lerp(prevFrame[n], curFrame[n], tt));
  }

  vals.stillAnimating = false;
  if (anim.length > 0) {
    // still animating
    if (prevFrame) {
      // restore the previous keyframe to be used again
      anim.unshift(prevFrame);
    }
    vals.stillAnimating = true;
  }

  return vals;
};

//

const changeZoom = function(st, {ox1, oy1, ox2, oy2}, {nx1, ny1, nx2, ny2}) {
  // "real" locations of the original zooming points
  const x1r = (ox1 - st.panX) / st.zoom;
  const y1r = (oy1 - st.panY) / st.zoom;
  const x2r = (ox2 - st.panX) / st.zoom;
  const y2r = (oy2 - st.panY) / st.zoom;
  const dxr = x1r - x2r;
  const dyr = y1r - y2r;

  // old distance
  const rd2 = dxr * dxr + dyr * dyr;
  // new distance
  const ndx = nx1 - nx2;
  const ndy = ny1 - ny2;
  const nd2 = ndx * ndx + ndy * ndy;
  // desired new zoom
  const z = Math.sqrt(nd2 / rd2);
  st.tempZoom = z / st.zoom;

  // "real" location of original center
  const cxr = (x1r + x2r) / 2;
  const cyr = (y1r + y2r) / 2;
  // new center
  const ncx = (nx1 + nx2) / 2;
  const ncy = (ny1 + ny2) / 2;

  // desired new scroll
  const sx = ncx - cxr * z;
  const sy = ncy - cyr * z;
  st.tempPanX = sx - st.panX;
  st.tempPanY = sy - st.panY;

  requestDraw(st);
};

const changeZoomMouse = function(st, {delta, cx, cy}) {
  // desired new zoom
  const z = st.zoom * Math.pow(2, delta / 100);

  // "real" location of original center
  const cxr = (cx - st.panX) / st.zoom;
  const cyr = (cy - st.panY) / st.zoom;

  // desired new scroll
  const sx = cx - cxr * z;
  const sy = cy - cyr * z;

  st.zoom = z;
  st.panX = sx;
  st.panY = sy;

  requestDraw(st);
};

const finishZoom = function(st) {
  st.panX += st.tempPanX;
  st.panY += st.tempPanY;
  st.tempPanX = 0;
  st.tempPanY = 0;
  st.zoom *= st.tempZoom;
  st.tempZoom = 1;

  requestDraw(st);
};

//

const getFromLocalStorage = function(name) {
  const ls = window.localStorage;
  if (!ls) {
    return null;
  }

  try {
    const thingStr = ls.getItem(name);
    const thing = JSON.parse(thingStr);
    return thing;
  } catch (e) {
    return null;
  }
};

const saveToLocalStorage = function(name, thing) {
  const ls = window.localStorage;
  if (!ls) {
    return false;
  }

  try {
    ls.setItem(name, JSON.stringify(thing));
  } catch (e) {
    return false;
  }

  return true;
};

//

const removeFromList = function(l, item) {
  for (let j = 0; j < l.length; ) {
    if (l[j] == item) {
      l.splice(j, 1);
    } else {
      j++;
    }
  }
};

//

const draw = function(st, t) {
  const ctx = st.ctx;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, st.screenWide, st.screenHigh);

  const scale = st.zoom * st.tempZoom;

  ctx.save();
  ctx.translate(st.panX + st.tempPanX, st.panY + st.tempPanY);
  ctx.scale(scale, scale);

  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 0, scale, false);
  }
  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 1, scale, false);
  }
  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 2, scale, false);
  }
  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 3, scale, false);
  }

  ctx.restore();

  if (st.selectedCircle) {
    st.menu.draw(st, ctx);
  }

  drawMinimap(st);
};

const drawMinimap = function(st) {
  const insetRelX = 8/10;
  const insetRelY = 8/10;
  const insetPadX = 1/25;
  const insetPadY = 1/25;

  const z = st.zoom * st.tempZoom;
  const px = st.panX + st.tempPanX;
  const py = st.panY + st.tempPanY;

  const screenMinX = (0 - px) / z;
  const screenMaxX = (st.screenWide - px) / z;
  const screenMinY = (0 - py) / z;
  const screenMaxY = (st.screenHigh - py) / z;

  if (st.drawables.length == 0) {
    return;
  }

  let minX = screenMinX;
  let minY = screenMinY;
  let maxX = screenMaxX;
  let maxY = screenMaxY;

  for (let i = 0; i < st.drawables.length; i++) {
    const bb = st.drawables[i].getBB();
    minX = Math.min(bb.x, minX);
    minY = Math.min(bb.y, minY);
    maxX = Math.max(bb.x + bb.w, maxX);
    maxY = Math.max(bb.y + bb.h, maxY);
  };

  const insetX = st.screenWide * (insetRelX - insetPadX);
  const insetY = st.screenHigh * (insetRelY - insetPadY);
  const scaleX = st.screenWide * (1 - insetRelX) / (maxX - minX);
  const scaleY = st.screenHigh * (1 - insetRelY) / (maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  const ctx = st.ctx;

  ctx.save();
  ctx.translate(insetX - minX * scale, insetY - minY * scale);
  ctx.scale(scale, scale);

  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 0, scale, true);
  }
  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 1, scale, true);
  }
  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 2, scale, true);
  }
  for (let i = 0; i < st.drawables.length; i++) {
    st.drawables[i].draw(st, ctx, 3, scale, true);
  }
  ctx.restore();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(
      insetX + (screenMinX - minX) * scale,
      insetY + (screenMinY - minY) * scale,
      (screenMaxX - screenMinX) * scale,
      (screenMaxY - screenMinY) * scale);
};

const click = function(st, x, y) {
  if (st.selectedCircle && st.menu.isWithin(st, x, y)) {
    st.menu.hit(st, x, y);
    requestDraw(st);
    return;
  }
  let gotHit = false;
  x = (x - st.panX) / st.zoom;
  y = (y - st.panY) / st.zoom;
  for (let i = st.hotspots.length - 1; i >= 0; --i) {
    const hs = st.hotspots[i];
    if (hs.isWithin(st, x, y) || hs.isWithinBG(st, x, y)) {
      hs.hit(st, x, y);
      gotHit = true;
      break;
    }
  }

  if (!gotHit) {
    st.selectedCircle = null;

    const rv = findPrune(st, x, y);
    if (st.selectedPrune && rv &&
        rv[0] == st.selectedPrune[0] &&
        rv[1] == st.selectedPrune[1]) {
      // do prune
      const p = rv[0];
      const c = rv[1];
      for (let i = 0; i < p.children.length; ++i) {
        if (p.children[i] == c) {
          p.children.splice(i, 1);
          break;
        }
      }
      // easiest way to access the full Circle object, hotspots would work as well
      for (let i = 0; i < st.drawables.length; ++i) {
        if (st.drawables[i].treeNode == c) {
          st.drawables[i].parent = null;
          break;
        }
      }
      st.circles.push(c);
      redoTreeNodeSize(c);
      st.selectedPrune = null;
    } else {
      st.selectedPrune = rv;
    }
  }
  requestDraw(st);
};

const touchHold = function(st, x, y) {
  x = (x - st.panX) / st.zoom;
  y = (y - st.panY) / st.zoom;
  for (let i = st.hotspots.length - 1; i >= 0; --i) {
    const hs = st.hotspots[i];
    if (hs.isWithin(st, x, y)) {
      //hs.hitHold(st, x, y);
      break;
    }
  }

  requestDraw(st);
};


const dragStart = function(st, x, y) {
  x = (x - st.panX) / st.zoom;
  y = (y - st.panY) / st.zoom;

  st.draggingObj = null;
  for (let i = st.hotspots.length - 1; i >= 0; --i) {
    const hs = st.hotspots[i];
    if (hs.isWithin(st, x, y)) {
      st.draggingObj = hs.dragStart(st, x, y);
      break;
    }
  }
  if (!st.draggingObj) {
    for (let i = st.hotspots.length - 1; i >= 0; --i) {
      const hs = st.hotspots[i];
      if (hs.isWithinBG(st, x, y)) {
        st.draggingObj = hs.dragStart(st, x, y);
        break;
      }
    }
  }

  requestDraw(st);
};

const drag = function(st, x1, y1, x2, y2) {
  if (st.draggingObj) {
    x1 = (x1 - st.panX) / st.zoom;
    y1 = (y1 - st.panY) / st.zoom;
    x2 = (x2 - st.panX) / st.zoom;
    y2 = (y2 - st.panY) / st.zoom;

    st.draggingObj.drag(st, x1, y1, x2, y2);
  } else {
    st.panX += x2 - x1;
    st.panY += y2 - y1;
  }

  requestDraw(st);
};

const dragEnd = function(st, x, y) {
  if (st.draggingObj) {
    x = (x - st.panX) / st.zoom;
    y = (y - st.panY) / st.zoom;

    st.draggingObj.dragEnd(st, x, y);
    st.draggingObj = null;
  }

  requestDraw(st);
};

const dragCancel = function(st) {
  if (st.draggingObj) {
    st.draggingObj.dragCancel(st, x, y);
    st.draggingObj = null;
  }

  requestDraw(st);
};

const mouseWheel = function(st, cx, cy, delta) {
  changeZoomMouse(st, {delta, cx, cy});
};

const pinchStart = function(st) {
  if (st.draggingObj) {
    dragCancel(st);
  }
};

const pinch = function(st, x1, y1, x2, y2) {
  const ps = st.pinchStarted;
  changeZoom(st, {ox1: ps.x1, oy1: ps.y1, ox2: ps.x2, oy2: ps.y2},
                 {nx1: x1, ny1: y1, nx2: x2, ny2: y2});
};

const pinchEnd = function(st) {
  finishZoom(st);
};

//

const addCircle = function(st, r, x, y, parent) {
  const circle = new Circle(r, x, y, parent);
  st.hotspots.push(circle);
  st.drawables.push(circle);

  // register under my parent
  if (parent) {
    st.parent = parent;
    parent.treeNode.children.push(circle.treeNode);
  }

  return circle;
};

const removeSpecificCircle = function(st, parentTreeNode, treeNode) {
  // remove from parent
  const ptnc = parentTreeNode.children;
  for (let i = 0; i < ptnc.length; i++) {
    if (ptnc[i] == treeNode) {
      ptnc.splice(i, 1);
      break;
    }
  }

  // remove from hotspots
  for (let i = 0; i < st.hotspots.length; i++) {
    if (st.hotspots[i].treeNode == treeNode) {
      st.hotspots.splice(i, 1);
      break;
    }
  }

  // remove from drawables
  for (let i = 0; i < st.drawables.length; i++) {
    if (st.drawables[i].treeNode == treeNode) {
      st.drawables.splice(i, 1);
      break;
    }
  }

  // recursively remove all children
  while (treeNode.children.length > 0) {
    removeSpecificCircle(st, treeNode, treeNode.children[0]);
  }
};

const restoreCircles = function(st) {
  st.drawables = [];
  st.hotspots = [];
  const circle = addCircle(st, 60, 0, 0, null);
  st.circles = [circle.treeNode];
  st.drawables[0].x = 0;
  st.drawables[0].y = 0;
};

/*
const restoreCircles = function(st) {
  st.circles = null;
  const circles = getFromLocalStorage('gene_circles2');
  if (circles) {
    st.circles = restoreCircle(st, null, 0, 0, circles);
  } else {
    st.circles = addCircle(st, 0, 0, 100, null, 0, 0);
  }
};

const restoreCircle = function(st, parentTreeNode, parentsDirX, parentsDirY, circle) {
  const treeNode =
    addCircle(
        st, circle.x, circle.y, circle.r, parentTreeNode, parentsDirX, parentsDirY);
  for (let i = 0; i < circle.children.length; ++i) {
    const cc = circle.children[i];
    restoreCircle(st, treeNode, cc.dirX, cc.dirY, cc.c);
  }

  return treeNode;
}
*/

const rotateTreeNode = function(tn, parent, odx, ody, da) {
  const px = parent.x;
  const py = parent.y;
  const dx = tn.x - px;
  const dy = tn.y - py;

  odx = px + Math.cos(da) * dx - Math.sin(da) * dy + odx - tn.x;
  ody = py + Math.sin(da) * dx + Math.cos(da) * dy + ody - tn.y;
  for (let i = 0; i < tn.children.length; ++i) {
    rotateTreeNode(tn.children[i], tn, odx, ody, da);
  }
  tn.x += odx;
  tn.y += ody;
};

const findPrune = function(st, x, y) {
  const scale = st.zoom;
  for (let i = 0; i < st.circles.length; ++i) {
    const rv = findPruneInner(st.circles[i], scale, x, y);
    if (rv) {
      return rv;
    }
  }
  return null;
};

const findPruneInner = function(node, scale, x0, y0) {
  const x1 = node.x;
  const y1 = node.y;
  for (let i = 0; i < node.children.length; ++i) {
    const c = node.children[i];
    const x2 = c.x;
    const y2 = c.y;

    const d = Math.abs((y2 - y1)*x0 - (x2 - x1)*y0 + x2*y1 - y2*x1) /
      Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
    if (d < 12 / scale) {
      // make sure the point isn't off the ends
      const dx01 = x0 - x1;
      const dy01 = y0 - y1;
      const dx21 = x2 - x1;
      const dy21 = y2 - y1;
      const dx02 = x0 - x2;
      const dy02 = x0 - x2;
      const dx12 = -dx21;
      const dy12 = -dx21;
      const dot01 = dx01 * dx21 + dy01 * dy21;
      const dot02 = dx02 * dx12 + dy02 * dy12;
      if (dot01 >= 0 && dot02 >= 0) {
        return [node, c];
      }
    }
    const rv = findPruneInner(c, scale, x0, y0);
    if (rv) {
      return rv;
    }
  }
  return null;
};

const redoTreeNodeSize = function(tn) {
  redoTreeNodeSizeInner(tn, 60);
};

const redoTreeNodeSizeInner = function(tn, r) {
  tn.r = r;
  for (let i = 0; i < tn.children.length; ++i) {
    redoTreeNodeSizeInner(tn.children[i], r * 0.75);
  }
};

const isAChildTreeNode = function(treeNode, possibleParent) {
  for (let i = 0; i < possibleParent.children.length; ++i) {
    if (treeNode == possibleParent.children[i]) {
      return true;
    } else {
      if (isAChildTreeNode(treeNode, possibleParent.children[i])) {
        return true;
      }
    }
  }
  return false;
};

const findAdopt = function(st, circle) {
  const x1 = circle.treeNode.x;
  const y1 = circle.treeNode.y;

  if (circle.treeNode.children.length > 0) {
    // don't adopt with a placeholder that already has children
    return null;
  }
  if (!circle.brandNew) {
    // the circle should be freshly dragged
    return null;
  }
  // drawables just an easy way to get all Circles, this should probably be done
  // differently or I should not have drawables and hotspots and such
  for (let i = 0; i < st.drawables.length; ++i) {
    if (circle == st.drawables[i]) {
      continue;
    }
    if (st.drawables[i].parent) {
      continue;
    }
    const x2 = st.drawables[i].treeNode.x;
    const y2 = st.drawables[i].treeNode.y;
    const r = st.drawables[i].treeNode.r;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx * dx + dy * dy < r * r) {
      if (!isAChildTreeNode(circle.treeNode, st.drawables[i].treeNode)) {
        return st.drawables[i];
      }
    }
  }
  return null;
};

// try to use given circle to select a new child for its parent
const tryAdopt = function(st, circle) {
  const x1 = circle.treeNode.x;
  const y1 = circle.treeNode.y;

  const rv = findAdopt(st, circle);
  // rv is the discovered orphan that circle's parent will replace circle with
  if (rv) {
    rv.parent = circle.parent;
    rv.parent.treeNode.children.push(rv.treeNode);
    // remove circle
    removeSpecificCircle(st, circle.parent.treeNode, circle.treeNode)
    redoTreeNodeSizeInner(rv.parent.treeNode, rv.parent.treeNode.r);

    return true;
  }
  return false;
};

const moveSubtree = function(tn, dx, dy) {
  tn.x += dx;
  tn.y += dy;
  for (let i = 0; i < tn.children.length; ++i) {
    moveSubtree(tn.children[i], dx, dy);
  }
};

const Circle = function(r, x, y, parent) {
  this.parent = parent;
  this.treeNode = {r, x, y, children: []};
};

Circle.prototype = {
  rimSize(scale) {
    const r = this.treeNode.r;
    let rim = 50 / scale;
    if (r * 2 * scale < 45) {
      rim = 0;
    } else if (r * 2 * scale < 50) {
      rim = 50 / scale * (r*2*scale - 45) / 5;
    }
    return rim;
  },
  // hotspot
  isWithin(st, x, y) {
    const scale = st.zoom * st.tempZoom;
    const r = this.treeNode.r;

    const dx = x - this.treeNode.x;
    const dy = y - this.treeNode.y;
    return dx * dx + dy * dy <= r * r;
  },
  isWithinBG(st, x, y) {
    const scale = st.zoom * st.tempZoom;
    const r = this.treeNode.r;
    const rim = this.rimSize(scale);

    const dx = x - this.treeNode.x;
    const dy = y - this.treeNode.y;
    return dx * dx + dy * dy <= (r + rim) * (r + rim);
  },
  hit(st, x, y) {
    if (st.selectedCircle == this) {
      st.selectedCircle = null;
    } else {
      st.selectedCircle = this;
    }
    st.selectedPrune = null;
  },
  dragStart(st, x, y) {
    const r = this.treeNode.r;

    const dx = x - this.treeNode.x;
    const dy = y - this.treeNode.y;
    const dd = dx * dx + dy * dy;

    if (dd > r * r) {
      const c = addCircle(st, r * 0.75, x, y, this);
      c.brandNew = true;
      return c;
    } else {
      return this;
    }
  },
  drag(st, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (this.parent && this.treeNode.children.length > 0 && (dx > 0 || dx < 0 || dy < 0 || dy > 0)) {
      const px = this.parent.treeNode.x;
      const py = this.parent.treeNode.y;
      const dpx1 = this.treeNode.x - px;
      const dpy1 = this.treeNode.y - py;
      const dpx2 = this.treeNode.x + dx - px;
      const dpy2 = this.treeNode.y + dy - py;
      const r1 = Math.sqrt(dpx1 * dpx1 + dpy1 * dpy1);
      const r2 = Math.sqrt(dpx2 * dpx2 + dpy2 * dpy2);
      // interpret drag as a rotation
      const dotProduct = dpx1 * dpx2 + dpy1 * dpy2;
      const determinant = dpx1 * dpy2 - dpx2 * dpy1;
      const rotateBy = Math.acos((dotProduct / r1 ) / r2) *
        (determinant < 0 ? -1 : 1);

      // rotate children by this amount
      for (let i = 0; i < this.treeNode.children.length; ++i) {
        rotateTreeNode(this.treeNode.children[i], this.treeNode, dx, dy, rotateBy);
      }
    } else {
      for (let i = 0; i < this.treeNode.children.length; ++i) {
        rotateTreeNode(this.treeNode.children[i], this.treeNode, dx, dy, 0);
      }
    }

    this.treeNode.x += dx;
    this.treeNode.y += dy;
  },
  dragEnd(st, x, y) {
    if (this.parent) {
      // try to use this node to adopt another
      if (!tryAdopt(st, this)) {
        // check if close enough to parent to delete
        const minDist = this.parent.treeNode.r;
        const dx = this.treeNode.x - this.parent.treeNode.x;
        const dy = this.treeNode.y - this.parent.treeNode.y;
        if (dx * dx + dy * dy < minDist * minDist) {
          removeSpecificCircle(st, this.parent.treeNode, this.treeNode);
        }
      }
    }
    this.brandNew = false;
  },
  dragCancel() {
    removeSpecificCircle(st, this.parent.treeNode, this.treeNode);
  },

  // drawable
  draw(st, ctx, layer, scale, inset) {
    const r = this.treeNode.r;
    if (layer == 3) {
      if (this == st.draggingObj) {
        if (this.parent) {
          // highlight pending adoption
          const rv = findAdopt(st, this);
          if (rv) {
            ctx.beginPath();
            ctx.arc(rv.treeNode.x, rv.treeNode.y, rv.treeNode.r, 0, Math.PI * 2);
            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 4/scale;
            ctx.stroke();
          } else {
            // cross-out for pending deletion
            const minDist = this.parent.treeNode.r;
            const dx = this.treeNode.x - this.parent.treeNode.x;
            const dy = this.treeNode.y - this.parent.treeNode.y;
            if (dx * dx + dy * dy < minDist * minDist) {
              ctx.beginPath();
              ctx.arc(this.treeNode.x, this.treeNode.y, r * 1.2, 0, Math.PI * 2);
              ctx.strokeStyle = '#f00';
              ctx.lineWidth = 4/scale;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(this.treeNode.x + Math.SQRT1_2 * r * 1.2,
                         this.treeNode.y + Math.SQRT1_2 * r *-1.2);
              ctx.lineTo(this.treeNode.x + Math.SQRT1_2 * r *-1.2,
                         this.treeNode.y + Math.SQRT1_2 * r * 1.2);
              ctx.stroke();
            }
          }
        }
      }
    } else if (layer == 2) {
      const selected = this == st.selectedCircle;

      ctx.beginPath();
      ctx.arc(this.treeNode.x, this.treeNode.y, r, 0, Math.PI * 2);
      if (selected) {
        ctx.fillStyle = '#000';
      } else {
        ctx.fillStyle = '#fff';
      }
      ctx.fill();
      if (!selected) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1/scale;
        ctx.stroke();
      }

      if (this.treeNode.s) {
        if (selected) {
          ctx.fillStyle = '#fff';
        } else {
          ctx.fillStyle = '#000';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(this.treeNode.x, this.treeNode.y);
        ctx.scale(r / 60, r / 60);
        ctx.font = '60px monospace';
        ctx.fillText(this.treeNode.s, 0, 0);
        ctx.restore();
      }

    } else if (layer == 1) {
      // edge
      if (this.parent) {
        const selected = st.selectedPrune &&
          st.selectedPrune[0] == this.parent.treeNode &&
          st.selectedPrune[1] == this.treeNode;
        ctx.beginPath();
        ctx.moveTo(this.treeNode.x, this.treeNode.y);
        ctx.lineTo(this.parent.treeNode.x, this.parent.treeNode.y);
        ctx.strokeStyle = selected ? '#f00' : '#000';
        ctx.lineWidth = (selected && !inset) ? 24/scale : 1/scale;
        ctx.stroke();
      }
    } else if (layer == 0) {
      // rim/handle
      const r = this.treeNode.r;
      const rim = this.rimSize(scale);

      if (!inset && rim > 0) {
        ctx.beginPath();
        ctx.arc(this.treeNode.x, this.treeNode.y, r + rim, 0, Math.PI * 2);
        ctx.fillStyle = '#eee';
        ctx.fill();
      }
    }
  },
  getBB() {
    const r = this.treeNode.r;
    return {x: this.treeNode.x - r, y: this.treeNode.y - r, w: r * 2, h: r * 2};
  },
};

const Menu = function(items) {
  this.items = items;
};

Menu.prototype = {
  forEachButton(st, f) {
    const panX = st.panX + st.tempPanX;
    const panY = st.panY + st.tempPanY;
    const scale = st.zoom * st.tempZoom;

    const cx = st.selectedCircle.treeNode.x * scale + panX - 40;
    const cy = st.selectedCircle.treeNode.y * scale + panY - 40;
    const r = 120;
    for (let i = 0; i < this.items.length; ++i) {
      const x = cx + Math.cos(i / this.items.length * 2 * Math.PI) * r;
      const y = cy + Math.sin(i / this.items.length * 2 * Math.PI) * r;

      if (!f(this.items[i], x, y)) {
        break;
      }
    }
  },
  draw(st, ctx) {
    this.forEachButton(st, function(item, x, y) {
      drawRoundRect(ctx, x, y, x + 80, y + 80, 5, '#fff', '#000');

      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '20px monospace';
      ctx.fillText(item, x + 40, y + 40);
      return true;
    });
  },

  isWithin(st, hitX, hitY) {
    let hit = false;
    this.forEachButton(st, function(item, x, y) {
      if (hitX >= x && hitX < x + 80 && hitY >= y && hitY < y + 80) {
        hit = true;
        return false;
      }
      return true;
    });

    return hit;
  },

  hit(st, hitX, hitY) {
    this.forEachButton(st, function(item, x, y) {
      if (hitX >= x && hitX < x + 80 && hitY >= y && hitY < y + 80) {
        if (st.selectedCircle) {
          st.selectedCircle.treeNode.s = item;
          st.selectedCircle = null;
        }
        return false;
      }
      return true;
    });
  },
};

STATE.hotspots = [];
STATE.drawables = [];
//STATE.menu = new Menu(["fib","-","+","1","2","n","def","r"]);
STATE.menu = new Menu(["A","B","C","D","E","F","G","H"]);
STATE.selectedCircle = null;
STATE.selectedPrune = null;
STATE.circles = [];
STATE.panX = 0;
STATE.panY = 0;
STATE.tempPanX = 0;
STATE.tempPanY = 0;
STATE.zoom = 1;
STATE.tempZoom = 1;

init(STATE);

restoreCircles(STATE);
STATE.panX = STATE.screenWide / 2;
STATE.panY = STATE.screenHigh / 2;

})();
