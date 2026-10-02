(function () {
  'use strict';

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  var revealObserver = null;
  var tileObserver = null;
  var tiltCleanups = [];

  function reducedMotion() {
    return reduceQuery.matches;
  }

  /* A transform-based progress bar avoids changing layout on every scroll. */
  var progress = document.createElement('div');
  progress.id = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  var progressQueued = false;
  function paintProgress() {
    var root = document.documentElement;
    var available = root.scrollHeight - root.clientHeight;
    var amount = available > 0 ? root.scrollTop / available : 0;
    progress.style.transform = 'scaleX(' + Math.max(0, Math.min(1, amount)) + ')';
    progressQueued = false;
  }
  function queueProgress() {
    if (progressQueued) return;
    progressQueued = true;
    requestAnimationFrame(paintProgress);
  }
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress, { passive: true });
  paintProgress();

  function settleReveal(element) {
    element.classList.remove('motion-reveal', 'is-visible');
    element.style.removeProperty('--reveal-delay');
  }

  function revealElement(element) {
    if (!element.classList.contains('motion-reveal')) return;
    element.classList.add('is-visible');
    var delay = parseInt(element.style.getPropertyValue('--reveal-delay'), 10) || 0;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      element.removeEventListener('transitionend', onTransitionEnd);
      settleReveal(element);
    }
    function onTransitionEnd(event) {
      if (event.target === element && event.propertyName === 'opacity') finish();
    }
    element.addEventListener('transitionend', onTransitionEnd);
    window.setTimeout(finish, delay + 850);
  }

  function setupReveals() {
    if (reducedMotion() || !('IntersectionObserver' in window)) return;

    var selector = [
      '.sec .side', '.about > p', '.create > .item', '.filter-bar',
      '.steps > .step', '.tiers > .tier', '.pays > .pay',
      '.form-card', '#reviews-list > .review-card', '#reviews-empty',
      '.feedback-box', '.faq-list > .faq', '.contacts > li'
    ].join(',');
    var targets = Array.prototype.slice.call(document.querySelectorAll(selector));
    var positions = new Map();

    targets.forEach(function (element) {
      var parent = element.parentElement;
      var index = positions.get(parent) || 0;
      positions.set(parent, index + 1);
      element.style.setProperty('--reveal-delay', Math.min(index, 5) * 65 + 'ms');
      element.classList.add('motion-reveal');
    });

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        revealElement(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (element) {
      var box = element.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.94 && box.bottom > 0) revealElement(element);
      else revealObserver.observe(element);
    });
  }

  function setupPortfolioTiles() {
    if (reducedMotion() || !('IntersectionObserver' in window)) return;

    var targets = Array.prototype.slice.call(document.querySelectorAll('#more-work .wc-work-item'));

    function settleTile(element) {
      element.classList.remove('motion-tile', 'is-visible');
      element.style.removeProperty('--tile-delay');
    }

    function revealTile(element) {
      if (!element.classList.contains('motion-tile')) return;
      element.classList.add('is-visible');

      var delay = parseInt(element.style.getPropertyValue('--tile-delay'), 10) || 0;
      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        element.removeEventListener('transitionend', onTransitionEnd);
        settleTile(element);
      }
      function onTransitionEnd(event) {
        if (event.target === element && event.propertyName === 'opacity') finish();
      }
      element.addEventListener('transitionend', onTransitionEnd);
      window.setTimeout(finish, delay + 850);
    }

    /* Arm tiles before observing them. The previous WAAPI animation applied
       opacity: 0 only after IntersectionObserver's asynchronous callback,
       which let a fully visible tile paint for one frame before disappearing. */
    targets.forEach(function (item) {
      var siblings = Array.prototype.slice.call(item.parentElement.children);
      var position = siblings.indexOf(item);
      item.style.setProperty('--tile-delay', (position % 4) * 65 + 'ms');
      item.classList.add('motion-tile');
    });

    tileObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tileObserver.unobserve(entry.target);
        revealTile(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    targets.forEach(function (item) {
      var box = item.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.95 && box.bottom > 0) {
        requestAnimationFrame(function () { revealTile(item); });
      } else {
        tileObserver.observe(item);
      }
    });
  }

  function bindTilt(elements) {
    if (reducedMotion() || !finePointerQuery.matches) return;

    Array.prototype.slice.call(elements).forEach(function (element) {
      if (element.dataset.tiltBound) return;
      element.dataset.tiltBound = 'true';
      element.classList.add('motion-tilt');

      var bounds = null;
      var frame = 0;
      var x = 0;
      var y = 0;

      function enter() {
        bounds = element.getBoundingClientRect();
        element.classList.add('is-tilting');
      }
      function move(event) {
        if (!bounds) bounds = element.getBoundingClientRect();
        x = (event.clientX - bounds.left) / bounds.width - 0.5;
        y = (event.clientY - bounds.top) / bounds.height - 0.5;
        if (frame) return;
        frame = requestAnimationFrame(function () {
          element.style.transform = 'perspective(900px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 4).toFixed(2) + 'deg) translateY(-4px)';
          frame = 0;
        });
      }
      function leave() {
        bounds = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        element.classList.remove('is-tilting');
        element.style.transform = '';
      }

      element.addEventListener('mouseenter', enter);
      element.addEventListener('mousemove', move);
      element.addEventListener('mouseleave', leave);
      tiltCleanups.push(function () {
        element.removeEventListener('mouseenter', enter);
        element.removeEventListener('mousemove', move);
        element.removeEventListener('mouseleave', leave);
        element.classList.remove('motion-tilt', 'is-tilting');
        element.style.transform = '';
        delete element.dataset.tiltBound;
      });
    });
  }

  function setupMotion() {
    if (reducedMotion()) return;
    document.documentElement.classList.add('motion-enabled');
    requestAnimationFrame(function () {
      document.documentElement.classList.add('motion-ready');
    });
    setupReveals();
    setupPortfolioTiles();
    bindTilt(document.querySelectorAll('.item, .tier, .pay, .review-card'));
  }

  function disableMotion() {
    document.documentElement.classList.remove('motion-enabled', 'motion-ready');
    if (revealObserver) revealObserver.disconnect();
    revealObserver = null;
    if (tileObserver) tileObserver.disconnect();
    tileObserver = null;
    document.querySelectorAll('.motion-tile').forEach(function (element) {
      element.classList.remove('motion-tile', 'is-visible');
      element.style.removeProperty('--tile-delay');
    });
    document.querySelectorAll('.motion-reveal').forEach(settleReveal);
    tiltCleanups.splice(0).forEach(function (cleanup) { cleanup(); });
  }

  window.__acBindTilt = bindTilt;
  setupMotion();

  reduceQuery.addEventListener('change', function () {
    disableMotion();
    if (!reducedMotion()) setupMotion();
  });
})();
