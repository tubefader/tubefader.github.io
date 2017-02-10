var main = {
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
			this.thumbnail = p.snippet.thumbnails.default.url;
			this.url = 'https://www.youtube.com/watch?v='+this.id;
			this.related = parent instanceof main.api.Video ? (parent.related == 49 ? 0 : parent.related+1) : 0;
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
					part: 'snippet',
					type: 'video',
					maxResults: 1
				}).execute(function(response) {
					if(main.exists(response, 'result', 'items')) {
						if(response.result.items.length > 0) callback(new self.Video(response.result.items[0]));
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
						maxResults: video.related+1
					}).execute(function(response) {
						if(main.exists(response, 'result', 'items')) {
							var items = response.result.items;
							var index = items.length > video.related+1 ? video.related+1 : 0;
							if(items.length > 0) callback(new self.Video(response.result.items[index], video));
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
	frame: {
		src: 'https://www.youtube.com/iframe_api?callback=main.frame.load',
		stack: [],
		do: function(callback) {
			if(this.provided) callback();
			else this.stack.push(callback);
		},
		get provided() {
			return main.exists('YT');
		},
		load: function() {
			for(var i = 0; i < this.stack.length; i++) this.stack[i]();
			this.stack = [];
		},
		append: function() {
			var self = this;

			var script = document.createElement('script');
			script.async = true;
			script.defer = true;
			script.src = this.src;
			window.onYouTubeIframeAPIReady = function() {
				self.load();
			};

			document.head.appendChild(script);
		},
		init: function() {
			this.append();
		}
	},
	Side: function(className) {
		var self = this;
		var timeout = null;
		var keep = false;

		var empty = document.createElement('li');
		empty.className = 'empty';
		empty.appendChild(document.createTextNode('No result'));

		this.element = document.querySelector('.'+className);
		this.search = this.element.querySelector('.search');
		this.input = this.element.querySelector('input');
		this.results = this.element.querySelector('ul');
		this.video = null;

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
					if(v) this.input.setAttribute('data-searching', '');
					else this.input.removeAttribute('data-searching');
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

		this.hideLater = function() {
			this.clear();
			timeout = setTimeout(function() {
				self.hide();
			}, 3000);
		};

		this.result = function(result) {
			var li = document.createElement('li');

			var thumbnail = document.createElement('img');
			thumbnail.className = 'thumbnail';
			thumbnail.src = result.thumbnail;

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

			li.addEventListener('mousedown', function() {
				self.video.loadVideoById(result.id);
			});

			return li;
		};

		this.element.addEventListener('mousemove', function() {
			self.show();
		});

		this.element.addEventListener('mouseout', function() {
			self.hide();
		});

		this.input.addEventListener('focus', function() {
			self.keep = true;
			if(self.results.innerHTML !== '') self.searching = true;
			self.clear();
		});

		this.input.addEventListener('blur', function() {
			self.keep = false;
			self.searching = false;
			self.hide();
		});

		this.input.addEventListener('keydown', function() {
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
						});
					}
				}
			}, 1);
		});

		main.frame.do(function() {
			var div = document.createElement('div');
			self.element.appendChild(div);
			self.video = new YT.Player(div, {
				playerVars: {
	            	color: 'white',
					autoplay: 0
				},
				events: {
					onReady: function(event) {
						event.target.pauseVideo();
					}
				}
			});
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
	init: function() {
		this.api.init();
		this.frame.init();
		this.cursor.init();
		this.left = new this.Side('left');
		this.right = new this.Side('right');
	}
};

main.init();
