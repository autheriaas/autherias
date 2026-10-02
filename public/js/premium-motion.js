(function () {
  'use strict';

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupMarqueeControl() {
    var marquee = document.querySelector('.studio-marquee');
    var toggle = document.querySelector('.marquee-toggle');
    if (!marquee || !toggle) return;

    function setPaused(paused) {
      marquee.classList.toggle('is-paused', paused);
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', paused ? 'Play moving studio highlights' : 'Pause moving studio highlights');
      toggle.textContent = paused ? 'Play' : 'Pause';
    }

    setPaused(reduceQuery.matches);
    toggle.addEventListener('click', function () {
      setPaused(!marquee.classList.contains('is-paused'));
    });
    reduceQuery.addEventListener('change', function (event) {
      if (event.matches) setPaused(true);
    });
  }

  function setupReviewCarousel() {
    var list = document.getElementById('reviews-list');
    if (!list) return;

    document.querySelectorAll('[data-review-direction]').forEach(function (button) {
      button.addEventListener('click', function () {
        var direction = Number(button.getAttribute('data-review-direction')) || 1;
        var card = list.querySelector('.review-card');
        var distance = card ? card.getBoundingClientRect().width + 14 : list.clientWidth * 0.82;
        list.scrollBy({
          left: direction * distance,
          behavior: reduceQuery.matches ? 'auto' : 'smooth'
        });
      });
    });
  }

  function splitStatement(element) {
    var original = element.textContent.trim();
    var fragment = document.createDocumentFragment();

    original.split(/\s+/).forEach(function (word, index, words) {
      var span = document.createElement('span');
      span.className = 'scrub-word';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = word;
      fragment.appendChild(span);
      if (index < words.length - 1) fragment.appendChild(document.createTextNode(' '));
    });

    element.textContent = '';
    element.setAttribute('aria-label', original);
    element.appendChild(fragment);
    return original;
  }

  function setupGsapMotion() {
    if (!window.gsap || !window.ScrollTrigger) return;

    window.gsap.registerPlugin(window.ScrollTrigger);
    var media = window.gsap.matchMedia();

    media.add({
      motionOK: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 901px)'
    }, function (context) {
      if (!context.conditions.motionOK) return;

      var statement = document.querySelector('.about-statement');
      var originalStatement = '';
      if (statement && !statement.querySelector('.scrub-word')) {
        originalStatement = splitStatement(statement);
        var words = statement.querySelectorAll('.scrub-word');
        window.gsap.fromTo(words,
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.045,
            ease: 'none',
            scrollTrigger: {
              trigger: statement,
              start: 'top 82%',
              end: 'bottom 48%',
              scrub: 0.6
            }
          }
        );
      }

      if (context.conditions.desktop) {
        var steps = Array.prototype.slice.call(document.querySelectorAll('#how-it-works .step'));
        steps.slice(0, -1).forEach(function (card, index) {
          window.gsap.to(card, {
            scale: 0.985 - index * 0.005,
            transformOrigin: 'center top',
            ease: 'none',
            scrollTrigger: {
              trigger: steps[index + 1],
              start: 'top 78%',
              end: 'top 28%',
              scrub: 0.55
            }
          });
        });
      }

      window.addEventListener('load', window.ScrollTrigger.refresh, { once: true });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
      }

      return function () {
        if (statement && originalStatement) {
          statement.textContent = originalStatement;
          statement.removeAttribute('aria-label');
        }
      };
    });
  }

  setupMarqueeControl();
  setupReviewCarousel();
  setupGsapMotion();
})();
