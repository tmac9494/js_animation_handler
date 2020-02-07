const easing = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

class Animation {
  constructor(settings) {
    const options = settings[3] || {};
    this.prevRuntime = 0;
    this.prevDuration = 0;
    this.property = settings.property || settings[0];
    this.schedule = settings.schedule || settings[1];
    this.nextUpdate = settings.from || this.schedule[0];
    this.lastUpdate = settings.from || this.schedule[0];
    this.duration = settings.duration || settings[2];
    this.easing = settings.easing || options.easing || 'easeInOut';
    this.delay = settings.delay || options.delay || 0;
    this.running = true;
    this.schedule = settings.schedule || settings[1];
    this.step = 0;
    this.running = true;
		this.completed = false;
    this.valueMap = settings.valueMap || options.valueMap;
		this.buffer = options.buffer || 0;
    this.value = function() {
      return(this.valueMap
        ? this.valueMap.replace('$v', this.nextUpdate) : this.nextUpdate
      )
    }
    this.updated = function() {
      this.lastUpdate = this.nextUpdate;
    }
    this.initialize();
  }

  reset = () => {
    this.completed = false;
    this.running = true;
    this.step = 0;
    this.nextUpdate = this.schedule[0];
    this.prevRuntime = 0;
    this.prevDuration = 0;
    this.lastUpdated = this.schedule[0];
  }

  initialize = () => {
    this.animationStatus = {};
    const scheduleKeys = Object.keys(this.schedule);
    scheduleKeys.forEach((percent, i) => {
      if (scheduleKeys[i + 1]) {
        this.animationStatus['step' + i] = {
          at: percent / 100,
          from: this.schedule[percent],
          to: this.schedule[scheduleKeys[i + 1]],
          duration: (scheduleKeys[i + 1] / 100) * this.duration,
          completed: false
        }
      }
    })
  }

  logic = (runtime) => {
		// console.log('logic')
    const thisStep = this.animationStatus['step' + this.step];
    const nextStep = this.animationStatus['step' + (this.step + 1)];
    const duration = thisStep.duration - this.prevDuration;
    let calcRuntime = runtime - this.delay;
    if (runtime >= this.delay) {
      const progress = easing[this.easing](
        Math.min((calcRuntime - this.prevRuntime) / duration, 1)
      );
      const distance = thisStep.from > thisStep.to
      ? thisStep.from - thisStep.to
      : thisStep.to - thisStep.from;
      const currentDistance = distance * progress;
      const progression = thisStep.from > thisStep.to
      ? thisStep.from - currentDistance
      : thisStep.from + currentDistance;
      this.nextUpdate = progression.toFixed(2);
			// console.log(thisStep.duration, calcRuntime, nextStep)
      if (thisStep.duration <= calcRuntime && nextStep) {
        this.step++;
        thisStep.completed = calcRuntime;
        this.prevRuntime = calcRuntime;
        this.prevDuration = thisStep.duration;
				// this.upated();
      } else if (thisStep.duration <= calcRuntime) {
        this.step++;
        this.running = false;
        this.nextUpdate = thisStep.to;
        thisStep.completed = calcRuntime;
        this.prevRuntime = calcRuntime;
				this.completed = true;
        this.prevDuration = thisStep.duration;
      }
    }
  }
}

class AnimationManager {
	constructor(animations) {
		this.animations = animations.map(settings => ({
			completed: false,
			animating: false,
			target: settings[0],
			startTime: null,
			animation: settings[1].map(anim => new Animation(anim)),
			settingsRef: settings,
			buffer: settings[2] ? settings[2].buffer || 0 : 0,
			animationFrame: null,
			// dims: settings[0].getBoundingClientRect()
		}));
		this.initializeStyles();
		this.handleScroll();
		window.addEventListener('scroll', this.handleScroll);
	}

	animate = animation => {
		return requestAnimationFrame(timeStamp => {
			animation.animating = true;
			let styles = {};
			let completed = true;
			if (animation.startTime === null) animation.startTime = timeStamp;
			const runtime = timeStamp - animation.startTime;
			animation.animation.forEach(animClass => {
				if (!animClass.completed) {
					animClass.logic(runtime);
					if (animClass.property === 'transform' && styles.transform)
						styles.transform += ' ' + animClass.value()
					else styles[animClass.property] = animClass.value();
					animClass.updated();
					if (!animClass.completed) completed = false;
				}
			})
			Object.keys(styles).forEach(key =>
				animation.target.style[key] = styles[key]
			)
			if (!completed) this.animate(animation)
			else {
				animation.completed = true;
				animation.animating = false;
			}
		})
	}

	handleScroll = e => {
		let scrolled = window.scrollY;
		this.animations.forEach((animation, i) => {
			let canAnimate = !animation.completed && !animation.animating;
      const inView = isElementInView(animation.target, animation.buffer);
			if (canAnimate && inView)
				animation.animationFrame = this.animate(animation)
			else if (!inView) {
				if (animation.animating) {
					cancelAnimationFrame(animation.animationFrame);
					animation.animating = false;
				}
        if (animation.completed) animation.animation.forEach(animClass => {
  				animation.completed = false;
  				animation.startTime = null;
          animClass.reset();
          animClass.initialize();
        });
				// animation.animation = animation.settingsRef[1].map(anim => new Animation(anim));
				this.initializeStyles(animation)
			}
		})
	}

	initializeStyles = (animationFromScroll=null) => {
		const setStyles = anim => {
			let styles = {};
			anim.animation.forEach(animClass => {
				styles[animClass.property] = animClass.value();
			})
			Object.keys(styles).forEach(key => {
				anim.target.style[key] = styles[key];
			})
		}
		if (animationFromScroll === null) {
			this.animations.forEach(anim => {
				setStyles(anim);
			})
		} else {
			setStyles(animationFromScroll);
		}
	}
}
