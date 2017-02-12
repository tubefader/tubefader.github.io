var main = {
	element: document.querySelector('main'),
	was: null,
	exists: function() {
		if(arguments.length > 0) {
			var object = typeof arguments[0] === 'string' ? window[arguments[0]] : arguments[0];
			if(typeof object !== 'object' || object === null) return false;

			for(var i = 1; i < arguments.length; i++) {
				object = object[arguments[i]];
				if(typeof object !== 'object' || object === null) return false;
			}
		}

		return true;
	},
	api: {
		src: 'https://apis.google.com/js/api.js',
		key: 'AIzaSyACWZUx0jw3tqKl5NVuXqxuB7siYiziPDA',
		stack: [],
		Video: function(p, parent) {
			if(Array.isArray(p)) {
				for(var i = 0; i < p.length; i++) p[i] = new main.api.Video(p[i], parent);
				return p;
			}

			this.id = p.id.videoId;
			this.title = p.snippet.title;
			this.channel = p.snippet.channelTitle;
			this.thumbnails = p.snippet.thumbnails;
			this.url = 'https://www.youtube.com/watch?v='+this.id;
			this.related = parent instanceof main.api.Video ? (parent.related == 49 ? 0 : parent.related+1) : 0;
			this.interval = null;

			this.src = function(callback) {
				if(typeof callback === 'function') {
					var xhr = new XMLHttpRequest();
					xhr.open('GET', 'https://helloacm.com/api/video/?cached&video='+this.url, true);
					xhr.onreadystatechange = function(event) {
						if(xhr.readyState == 4 && xhr.status == 200) {
							var response = JSON.parse(xhr.responseText);
							callback(response.url);
						}
					};
					xhr.send();
				}
			};
		},
		do: function(callback) {
			if(this.provided) callback();
			else this.stack.push(callback);
		},
		get provided() {
			return main.exists('gapi', 'client', 'youtube');
		},
		get load() {
			var self = this;

			return function() {
				gapi.load('client', function() {
					gapi.client.load('youtube', 'v3', function() {
						gapi.client.setApiKey(self.key);

						for(var i = 0; i < self.stack.length; i++) self.stack[i]();
						self.stack = [];
					});
				});
			};
		},
		search: function(keywords, callback) {
			var self = this;

			this.do(function() {
				gapi.client.youtube.search.list({
					q: keywords,
					part: 'snippet',
					type: 'video',
					videoEmbeddable: 'true',
					maxResults: 15
				}).execute(function(response) {
					if(main.exists(response, 'result', 'items')) {
						callback(new self.Video(response.result.items));
					}
				});
			});
		},
		infos: function(id, callback) {
			var self = this;

			this.do(function() {
				gapi.client.youtube.videos.list({
					id: id,
					part: 'snippet,status',
					type: 'video',
					maxResults: 1
				}).execute(function(response) {
					if(main.exists(response, 'result', 'items')) {
						if(response.result.items.length > 0) {
							var item = response.result.items[0];
							if(item.status.embeddable) callback(new self.Video(item));
						}
						else callback(null);
					}
				});
			});
		},
		related: function(video, callback) {
			if(video instanceof this.Video) {
				var self = this;

				this.do(function() {
					gapi.client.youtube.search.list({
						relatedToVideoId: video.id,
						part: 'snippet',
						type: 'video',
						videoEmbeddable: 'true',
						maxResults: video.related+1
					}).execute(function(response) {
						if(main.exists(response, 'result', 'items')) {
							var items = response.result.items;
							if(items.length > 0) {
								var index = items.length > video.related+1 ? video.related+1 : 0;
								callback(new self.Video(items[index], video));
							}
							else callack(null);
						}
					});
				});
			}
		},
		append: function() {
			var script = document.createElement('script');
			script.async = true;
			script.defer = true;
			script.src = this.src;
			script.addEventListener('load', this.load);
			script.addEventListener('readystatechange', function() {
				if(this.readyState === 'complete') this.onload();
			});

			document.head.appendChild(script);
		},
		init: function() {
			this.append();
		}
	},
	Side: function(className, opposite) {
		var self = this;
		var timeout = null;
		var keep = false;

		var empty = document.createElement('li');
		this.offset = -1;
		empty.className = 'empty';
		empty.appendChild(document.createTextNode('No result'));

		this.element = document.querySelector('.'+className);
		this.search = this.element.querySelector('.search');
		this.input = this.element.querySelector('input');
		this.results = this.element.querySelector('ul');
		this.video = this.element.querySelector('video');
		this.progressElement = this.element.querySelector('.progress');
		this.overwritten = false;

		Object.defineProperties(this, {
			visible: {
				set: function(v) {
					if(v) self.search.setAttribute('data-visible', '');
					else self.search.removeAttribute('data-visible');
				}
			},
			keep: {
				get: function() {
					return keep;
				},
				set: function(v) {
					keep = !!v;
					if(v) document.body.setAttribute('data-keep', '');
					else document.body.removeAttribute('data-keep');
				}
			},
			searching: {
				set: function(v) {
					if(v) {
						this.input.setAttribute('data-searching', '');
						main.config.hidden = true;
					}
					else {
						this.input.removeAttribute('data-searching');
						main.config.hidden = false;
					}
				}
			},
			src: {
				get function() {
					return this.video.src;
				},
				set: function(v) {
					this.video.src = v;
				}
			},
			volume: {
				get: function() {
					return this.video.volume;
				},
				set: function(v) {
					this.video.volume = v < 0 ? 0 : (v > 1 ? 1 : v);
				}
			},
			paused: {
				get: function() {
					return this.video.paused;
				}
			},
			ready: {
				get: function() {
					return self.video.readyState == 4;
				}
			},
			opposite: {
				get: function() {
					return main[opposite];
				}
			},
			poster: {
				set: function(v) {
					var keys = Object.keys(v);
					this.video.poster = v[keys[keys.length - 1]].url;
				}
			},
			duration: {
				get: function() {
					return this.video.duration;
				}
			},
			currentTime: {
				get: function() {
					return this.video.currentTime;
				}
			},
			progress: {
				set: function(v) {
					this.progressElement.style.width = 100*v+'%';
				}
			},
			active: {
				set: function(v) {
					if(v) self.video.setAttribute('data-active', '');
					else self.video.removeAttribute('data-active');
				}
			}
		});

		this.url = function(input) {
			var match = input.match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/);
			if(match === null) return false;
			else return match[5];
		};

		this.clear = function() {
			clearTimeout(timeout);
		};

		this.show = function() {
			this.hideLater();
			this.visible = true;
		};

		this.hide = function() {
			if(!this.keep) {
				this.clear();
				this.visible = false;
			}
		};

		this.play = function(now, callback) {
			if(now) {
				this.video.play();
				this.active = true;
				this.opposite.active = false;
			}
			else {
				this.volume = 0;
				var play = function() {
					self.play(true);
					self.fade(1, callback);
					self.video.removeEventListener('canplay', play);
				};
				if(!this.ready) this.video.addEventListener('canplay', play);
				else play();
			}
		};

		this.pause = function(now, callback) {
			if(now) {
				this.video.pause();
				this.active = false;
			}
			else {
				callback = typeof callback === 'function' ? callback : function() {};
				this.fade(0, function() {
					self.pause(true);
					callback();
				});
			}
		};

		this.fadeStep = function(destination) {
			return (destination-this.volume)/main.config.fadeDuration;
		};

		this.ease = function(progress, destination) {
			return main.config.ease == 'ease' ? Math.pow(1 - destination - progress, 2)*3 : 1;
		};

		this.fade = function(destination, callback) {
			callback = typeof callback === 'function' ? callback : function() {};
			var step = this.fadeStep(destination);
			var duration = main.config.fadeDuration;
			var previous = 0;
			var start = null;

			clearInterval(self.interval);
			self.interval = setInterval(function() {
				if(start === null) {
					start = (new Date()).getTime();
				}
				var t = (new Date()).getTime() - start;
				var delta = t - previous;
				if(t < duration || self.volume != destination) {
					if(delta > 0) {
						previous = t;
						self.volume += step*delta*self.ease(t/duration, destination);
					}
				}
				else {
					clearInterval(self.interval);
					callback();
				}
			}, 1);
		};

		this.load = function(video, callback, overwrite) {
			if(video === null) {
				this.input.value = 'The video is unreachable';
			}
			else {
				callback = typeof callback === 'function' ? callback : function() {};
				this.poster = video.thumbnails;
				this.input.value = video.title;
				this.pause(true);
				this.video.object = video;
				this.overwritten = overwrite ? true : false;
				main.element.setAttribute('data-init', '');
				video.src(function(src) {
					self.progress = 0;
					self.src = src;
					callback();
				});
			}
		};

		this.hideLater = function() {
			this.clear();
			timeout = setTimeout(function() {
				self.hide();
			}, 3000);
		};

		var load = function(video) {
			return function() {
				self.load(video, function() {
					if(self.opposite.paused) {
						self.play(true);
						if(!self.opposite.overwritten) {
							main.api.related(video, function(related) {
								self.opposite.load(related);
							});
						}
					}
				}, true);
			};
		};

		this.result = function(result) {
			var li = document.createElement('li');

			var thumbnail = document.createElement('img');
			thumbnail.className = 'thumbnail';
			thumbnail.src = result.thumbnails.default.url;

			var infos = document.createElement('div');
			infos.className = 'infos';

			var title = document.createElement('span');
			title.className = 'title';

			var channel = document.createElement('span');
			channel.className = 'channel';

			channel.appendChild(document.createTextNode(result.channel));
			title.appendChild(document.createTextNode(result.title));
			infos.appendChild(title);
			infos.appendChild(channel);
			li.appendChild(thumbnail);
			li.appendChild(infos);

			li.video = result;

			li.addEventListener('mousedown', load(result));

			return li;
		};

		this.element.addEventListener('mousemove', function() {
			self.show();
		});

		this.element.addEventListener('mouseout', function() {
			self.hide();
		});

		this.video.addEventListener('timeupdate', function() {
			if(self.duration - self.currentTime <= main.config.fadeDuration/1000) {
				self.pause(false, function() {
					main.api.related(self.video.object, function(related) {
						self.load(related);
					});
				});
				self.opposite.play();
			}
			self.progress = self.currentTime/self.duration;
		});

		this.element.addEventListener('click', function(event) {
			if(!self.input.focused) {
				if(self.paused && !self.opposite.paused) {
					self.play();
					self.opposite.pause();
				}
				else if(!self.paused && self.opposite.paused) {
					self.opposite.play();
					self.pause();
				}
				else if(main.was) {
					main.was.play(true);
				}
			}
		});

		this.results.addEventListener('click', function(event) {
			main.config.open = false;
			event.stopPropagation();
		});

		this.results.addEventListener('dblclick', function(event) {
			event.stopPropagation();
		});

		this.input.addEventListener('click', function(event) {
			main.config.open = false;
			event.stopPropagation();
		});

		this.input.addEventListener('dblclick', function(event) {
			event.stopPropagation();
		});

		this.input.addEventListener('focus', function() {
			self.keep = true;
			if(self.results.innerHTML !== '') self.searching = true;
			self.clear();
			setTimeout(function() {
				self.input.select();
			}, 1);
		});

		this.input.addEventListener('blur', function() {
			self.keep = false;
			self.searching = false;
			self.hide();
		});

		this.input.addEventListener('keydown', function(event) {
			var results = self.results.querySelectorAll('li');
			if(event.keyCode == 38 || event.keyCode == 40) {
				if(event.keyCode == 38) {
					self.offset--;
					if(self.offset < 0) self.offset = results.length - 1;
				}
				else {
					self.offset++;
					if(self.offset >= results.length) self.offset = 0;
				}
				var result = results[self.offset];
				for(var i = 0; i < results.length; i++) results[i].removeAttribute('data-selected');
				result.setAttribute('data-selected', '');

				var min = result.offsetHeight*self.offset;
				var max = result.offsetHeight*(self.offset-1);

				if(self.results.scrollTop < min) self.results.scrollTop = min;
				if(self.results.scrollTop > max) self.results.scrollTop = max;
			}
			else if(event.keyCode == 13) {
				if(self.offset >= 0 && self.offset < results.length) {
					load(results[self.offset].video)();
					this.blur();
				}
			}
			else if(event.keyCode == 27) {
				this.blur();
				event.preventDefault();
			}
			else if(![37, 39, 16].includes(event.keyCode)) {
				var input = this;
				setTimeout(function() {
					var value = input.value;

					if(value === '') {
						self.searching = false;
						self.results.innerHTML = '';
					}
					else {
						var id = self.url(value);
						if(id) {
							main.api.infos(id, function(result) {
								self.searching = true;
								self.results.innerHTML = '';
								if(result) {
									self.results.appendChild(self.result(result));
								}
								else self.results.appendChild(empty);
							});
						}
						else {
							main.api.search(value, function(results) {
								self.searching = true;
								self.results.innerHTML = '';
								if(results.length === 0) {
									self.results.appendChild(empty);
								}
								else {
									for(var i = 0; i < results.length; i++) self.results.appendChild(self.result(results[i]));
								}
								self.offset = -1;
							});
						}
					}
				}, 1);
			}
		});
	},
	cursor: {
		timeout: null,
		set visible(v) {
			if(v) document.body.removeAttribute('data-cursor-hidden');
			else document.body.setAttribute('data-cursor-hidden', '');
		},
		clear: function() {
			clearTimeout(this.timeout);
		},
		show: function() {
			var self = this;

			this.hide();
			this.visible = true;
		},
		hide: function() {
			var self = this;

			this.clear();
			this.timeout = setTimeout(function() {
				self.visible = false;
			}, 3000);
		},
		init: function() {
			var self = this;


			this.hide();
			document.body.addEventListener('mousemove', function() {
				self.show();
			});
		}
	},
	left: null,
	right: null,
	config: {
		element: document.querySelector('.config'),
		toggler: document.querySelector('.config span'),
		inputs: {
			fadeDuration: document.querySelector('#config-fade-duration'),
			fadeCurve: document.querySelector('#config-fade-curve')
		},
		get open() {
			return this.element.getAttribute('data-open') !== null;
		},
		set open(v) {
			if(v) this.element.setAttribute('data-open', '');
			else this.element.removeAttribute('data-open');
		},
		set hidden(v) {
			if(v) this.element.setAttribute('data-hidden', '');
			else this.element.removeAttribute('data-hidden');
		},
		fadeDuration: 10000,
		fadeCurve: 'ease',
		init: function() {
			var self = this;

			this.element.addEventListener('click', function(event) {
				event.stopPropagation();
			});

			this.toggler.addEventListener('click', function() {
				self.open = !self.open;
			});

			this.inputs.fadeDuration.addEventListener('keydown', function() {
				var input = this;
				setTimeout(function() {
					var fadeDuration = parseFloat(input.value);
					if(!isNaN(fadeDuration)) self.fadeDuration = fadeDuration*1000;
				}, 1);
			});

			this.inputs.fadeDuration.addEventListener('change', function() {
				this.value = self.fadeDuration/1000;
			});

			this.inputs.fadeCurve.addEventListener('change', function() {
				self.fadeCurve = this.value;
			});

			window.addEventListener('click', function() {
				self.open = false;
			});

			window.addEventListener('keydown', function(event) {
				if(event.keyCode == 27 && self.open) {
					self.open = false;
					event.preventDefault();
				}
			});
		}
	},
	init: function() {
		var self = this;

		this.api.init();
		this.cursor.init();
		this.config.init();
		this.left = new this.Side('left', 'right');
		this.right = new this.Side('right', 'left');

		window.addEventListener('keydown', function(event) {
			if(event.keyCode == 32  && !self.left.input.focused && !self.right.input.focused) {
				if(!self.left.paused || !self.right.paused) {
					self.was = !self.left.paused ? self.left : self.right;
					self.left.pause(true);
					self.right.pause(true);
				}
				else {
					if(self.was) self.was.play(true);
					else self.left.play(true);
				}
			}
		});
	}
};

main.init();
