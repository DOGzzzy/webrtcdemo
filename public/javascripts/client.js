      var videos = [];
      var rooms = [1, 2, 3, 4, 5];
      var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection;

      // set video's layout in page , automaticly adapt to fit the best layout
      function getNumPerRow() {
        var len = videos.length;
        var biggest;

        // Ensure length is even for better division.
        if(len % 2 === 1) {
          len++;
        }

        biggest = Math.ceil(Math.sqrt(len));
        while(len % biggest !== 0) {
          biggest++;
        }
        return biggest;
      }

      function subdivideVideos() {
        var perRow = getNumPerRow();
        var numInRow = 0;
        for(var i = 0, len = videos.length; i < len; i++) {
          var video = videos[i];
          setWH(video, i);
          numInRow = (numInRow + 1) % perRow;
        }
      }

      function setWH(video, i) {
        var perRow = getNumPerRow();
        var perColumn = Math.ceil(videos.length / perRow);
        var width = Math.floor((window.innerWidth) / perRow);
        var height = Math.floor((window.innerHeight - 190) / perColumn);
        video.width = width;
        video.height = height;
        video.style.position = "absolute";
        video.style.left = (i % perRow) * width + "px";
        video.style.top = Math.floor(i / perRow) * height + "px";
      }

      function cloneVideo(domId, socketId) {
        var video = document.getElementById(domId);
        var clone = video.cloneNode(false);
        clone.id = "remote" + socketId;
        document.getElementById('videos').appendChild(clone);
        videos.push(clone);
        return clone;
      }

      function removeVideo(socketId) {
        var video = document.getElementById('remote' + socketId);
        if(video) {
          videos.splice(videos.indexOf(video), 1);
          video.parentNode.removeChild(video);
        }
      }

      function addToChat(msg, color) {
        var messages = document.getElementById('messages');
        msg = sanitize(msg);
        if(color) {
          msg = '<span style="color: ' + color + '; padding-left: 15px">' + msg + '</span>';
        } else {
          msg = '<strong style="padding-left: 15px">' + msg + '</strong>';
        }
        messages.innerHTML = messages.innerHTML + msg + '<br>';
        messages.scrollTop = 10000;
      }
      
      function sanitize(msg) {
        return msg.replace(/</g, '&lt;');
      }

      function initFullScreen() {
        var button = document.getElementById("fullscreen");
        button.addEventListener('click', function(event) {
          var elem = document.getElementById("videos");
          //show full screen 
          elem.webkitRequestFullScreen();
        });
      }

      function initNewRoom() {
        var button = document.getElementById("newRoom");

        button.addEventListener('click', function(event) {

          var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
          var string_length = 8;
          var randomstring = '';
          for(var i = 0; i < string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
          }

          window.location.hash = randomstring;
          location.reload();
        })
      }

      function initChat() {
        var input = document.getElementById("chatinput");
        var room = window.location.hash.slice(1);
        var color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

        input.addEventListener('keydown', function(event) {
          var key = event.which || event.keyCode;
          if(key === 13) {
            rtc._socket.send(JSON.stringify({
              "eventName": "chat_msg",
              "data": {
                "messages": input.value,
                "room": room,
                "color": color
              }
            }), function(error) {
              if(error) {
                console.log(error);
              }
            });
            addToChat(input.value);
            input.value = "";
          }
        }, false);
        rtc.on('receive_chat_msg', function(data) {
          console.log(data.color);
          addToChat(data.messages, data.color.toString(16));
        });
      }


      function init() {
        if(PeerConnection) {
          rtc.createStream({
            "video": true,
            "audio": true
          }, function(stream) {
            document.getElementById('you').src = URL.createObjectURL(stream);
            videos.push(document.getElementById('you'));
            rtc.attachStream(stream, 'you');
            subdivideVideos();
          });
        } else {
          alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
        }

        if(typeof WebSocket === 'undefined') {
          console.log(WebSocket);
        }
        var room = window.location.hash.slice(1);
        //need to alter to your ip address
        //When using localhost
        rtc.connect("ws://webrtcdemo.herokuapp.com:8001", room);

        rtc.on('add remote stream', function(stream, socketId) {
          console.log("ADDING REMOTE STREAM...");
          var clone = cloneVideo('you', socketId);
          document.getElementById(clone.id).setAttribute("class", "");
          rtc.attachStream(stream, clone.id);
          subdivideVideos();
        });
        rtc.on('disconnect stream', function(data) {
          console.log('remove ' + data);
          removeVideo(data);
        });
        initFullScreen();
        initNewRoom();
        initChat();
      }

      window.onresize = function(event) {
        subdivideVideos();
      };