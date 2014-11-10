// The --static flag allows for valid json
// salt '*' samba_users.stats --out=json --static --out-file=samba_summary.json

// requires filter.js
// requires myhtml.js

var MH = new MyHTML();

var DataInterface_defaults = {
    poll_interval: 60000, // 60 seconds
    latest_doc_suffix: '_all_docs%3Flimit=1&include_docs=true&descending=true', // %3F is for ?
}

function DataInterface(config) {
    'use strict';
    this.baseurl = config.baseurl;
    this.db_prefix = config.db_prefix;
    if (config.poll_interval != undefined) {
        this.poll_interval = config.poll_interval;
    } else {
        this.poll_interval = DataInterface_defaults.poll_interval;
    }

    this.db_servers = {};
    this.polls = 0;

    this.ajax_json_err = function(xhr, httpstatus, value, context) {
        console.log("error fetching " + context + ": ");
        console.log(xhr);
        console.log(httpstatus);
        console.log(value);
    };

    this.discover = function() {
        var discoverurl = this.baseurl + '_all_dbs';

        console.log("Discovering dbs at " + discoverurl);

        var instance = this;
        this
        var db_prefix = this.db_prefix;
        var db_servers = this.db_servers;
        var baseurl = this.baseurl;

        $.ajax({
            dataType: "json",
            type: 'GET',
            url: discoverurl,
            headers:{"Accept": "application/json"},
            mimeType: "application/json",
            data: '',
            })
        .done(
            function(data, httpstatus) {
                var ignored = [];
                console.log(httpstatus);
                $.each(data, function(key, database) {
                    if (database.startsWith(db_prefix)) {
                        var servername = database.replace(db_prefix, '');
                        console.log("Data exists for server: " + servername);
                        if (instance.db_servers[servername] == undefined) {
                            instance.db_servers[servername] = {
                                url: baseurl + database,
                                latest_doc_url: baseurl + database + '/' + DataInterface_defaults.latest_doc_suffix
                                };
                        }
                        $('#sambacontainer').trigger('foundnewserver', [servername]);
                        console.log('already known: ' + servername);
                    } else {
                        ignored.push(database);
                    }
                });
                console.log("Ignored databases (not matching prefix '" + db_prefix + "'): ", ignored);
                console.log("discovered servers", instance.db_servers);
                // instance.poll_loop();
            })
        .fail(
            function(xhr, httpstatus, value) {
                instance.ajax_json_err(xhr, httpstatus, value, 'inventory');
            }
        );
    };
    this.poll_loop = function() {
        /*
         * Increments this.polls
         * For every known server, updates data
         * Schedules next call in config.poll_interval
         */
        console.log("polling for time: " + ++this.polls);
        var instance = this;
        $.each(this.db_servers, function(servername, server) {
            var latest_doc_url = server.url + '/' + DataInterface_defaults.latest_doc_suffix;
            console.log('polling for ' + servername + ' at ' + latest_doc_url);
            $.ajax({
                dataType: "json",
                type: 'GET',
                url: latest_doc_url,
                headers:{"Accept": "application/json"},
                mimeType: "application/json",
                data: '',
                }).done(function(data, httpstatus) {
                    console.log(httpstatus);
                    instance.db_servers[servername][latest_info] = data;
                }).fail(function(xhr, httpstatus, value) {
                    instance.ajax_json_err(xhr, httpstatus, value, servername);
                });

        });

        var instance = this;
        // re arm timeout
        window.setTimeout(
            function() {
                // workaround so that this represents current this and not the
                // global object (window)
                instance.poll_loop.apply(instance);
            },
            this.poll_interval
        );
    };
    this.poll_server = function(servername) {
        var server = this.db_servers[servername];
        var instance = this;
        console.log('polling for ' + servername + ' at ' + server.latest_doc_url);
        $.ajax({
            dataType: "json",
            type: 'GET',
            url: server.latest_doc_url,
            headers:{"Accept": "application/json"},
            mimeType: "application/json",
            data: '',
            }).done(function(data, httpstatus) {
                console.log(httpstatus);
                instance.db_servers[servername].in_error = false;
                instance.db_servers[servername].latest_info = data;
                instance.db_servers[servername].last_fetch = moment();
                $('#sambacontainer div.' + servername).trigger('dataupdated', data);

            }).fail(function(xhr, httpstatus, value) {
                instance.db_servers[servername].in_error = true;
                instance.ajax_json_err(xhr, httpstatus, value, servername);
                $('#sambacontainer div.' + servername).trigger('dataupdate_error', value);
            });
    }
    console.log("couchdb interface up");
}

function DrawingMachine(data) {
    'use strict';
    // DataInterface
    this.data = data;
    // servername -> object
    this.htmlitems = {
        timestamps: {},
    };
    var instance = this;
    $('#sambacontainer').bind('foundnewserver', function(event, servername){
        instance.drawserver(servername);
    });


    console.log("drawing machine up");

    /*
     * DrawingMachine.functions
     */

    this.getselector = function(servername) {
        return '#sambacontainer div.' + servername;
    }
    this.debuglinks = function(servername) {
        var local_refresher = MH.anamenode(
            '#',
                MH.imgnode('refresh.png', 'Forcer mise à jour', "32")
                .css('vertical-align', 'middle')
                .bind('click', function(event){
                    console.log('please refresh '  + servername);
                    data.poll_server(servername);
                })
        );

        var node = MH.htmlnode("span")
            .addClass('debuglinks')
            .append(
                MH.anamenode(servername + '-debug', ' ')
                .bind('click', function() {
                    $(instance.getselector(servername) + ' span.debuglinks span.content')
                    .toggle();
                    }
                )
                .append(
                    MH.imgnode('face-smile-gearhead-male.png', 'Info de debug')
                    .css('vertical-align', 'middle')
                )
            )
            .append(
                MH.htmlnode('span')
                .addClass('content')
                .addClass('hidden')
                .append(
                    MH.atonode(data.db_servers[servername].url)
                    .text('database url')
                    .css('font-size', 'x-small')
                )
                .append(' ')
                .append(
                    MH.atonode(data.db_servers[servername].latest_doc_url)
                    .text('latest doc in db')
                    .css('font-size', 'x-small')
                )
                .append(' ')
                .append(local_refresher)
            )
        return node;
    };
    this.updatetimes = function() {
        console.log("updatetimes");
        $.each(instance.htmlitems.timestamps, function(servername, container){
            var serverinfo = instance.data.db_servers[servername];
            if (serverinfo.in_error == false) {
                var date = instance.data.db_servers[servername].last_fetch;
                container.text(date.fromNow());
            }
        });
        window.setTimeout(
            function() {
                instance.updatetimes.apply(instance);
            },
            5000
        );
    };
    this.drawserver = function(servername) {
        var lastupdated_span = MH.htmlnode('span')
            .addClass('server.timestamp.' + servername);
        instance.htmlitems.timestamps[servername] = lastupdated_span;
        var server_container = MH.htmlnode("div")
            .addClass('server')
            .addClass(servername)
            .bind('dataupdated', function(theevent, data){
                $(instance.getselector(servername) + ' div.lastupdate')
                .text(
                    'Dernière mise à jour: '
                )
                .append(lastupdated_span);
                $(instance.getselector(servername) + ' div.errormessage').hide();
            })
            .bind('dataupdate_error', function(theevent, errorinfo, uri){
                console.log('errorinfo', errorinfo);
                $(instance.getselector(servername) + ' div.errormessage').text(errorinfo.message).show();
            })
            .append(
                MH.htmlnode("h3")
                .append(
                    MH.htmlnode("div")
                    .append(
                        MH.anamenode(
                            servername,
                            MH.imgnode('server.png', servername, "32")
                                .css('vertical-align', 'middle')
                        )
                        .append(servername)
                    )
                    .append(' ')
                    .append(instance.debuglinks(servername))
                )
            )
        .append(
            $(document.createElement("div"))
            .addClass('lastupdate')
            .text('En attente de données')
        )
        .append(
                MH.htmlnode("div")
                .addClass('errormessage')
                .hide()
        );

        $('#sambacontainer').append(server_container);
    };

    this.updatetimes();
}

var SambaLib = {
  selectors: {
    target: "div#sambacontainer",
    sites_available: 'div#sites div.filteravailable',
    sites_enabled: 'div#sites div.filterenabled',
    overall: 'div.overall',
  },
  jq_center: function () {
    this.css("position","absolute");
    this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +
    $(window).scrollTop()) + "px");
    this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
    $(window).scrollLeft()) + "px");
    return this;
  },
  start: function(config) {
    if (this.jqpatched) {
      console.log("Sambascript already installed");
    } else {
      jQuery.fn.center = SambaLib.jq_center;
      this.jqpatched = true;
    }
    this.data = new DataInterface(config.couchdb);
    this.drawing_machine = new DrawingMachine(this.data);
    this.data.discover();
    // FilterLib.register_refresh(this.refresh);
    // FilterLib.refresh();
    console.log("installed Sambascript");
    return this;
  },
  clickabletd: function(text, htmlclass, title){
    var cell, link;
    cell = $(document.createElement('td'));
    link = $(document.createElement('a'))
    .attr('href', 'javascript:void(0)')
    .addClass("mainlink")
    .text(text)
    .attr("title", title);
    cell.append(link);
    cell.addClass(htmlclass);
    return cell;
  },
  mkuserlist: function(clientlist, shortname) {
    'use strict';
    var main_object = this;
    var nextindex;
    var userlist = $(document.createElement("ul"));
    $.each(clientlist, function(index, data) {
      var item, machinelink, opensublist, removesublist, newlist;
      item = $(document.createElement("li"));

      item.attr('id', data.machine);

      machinelink = $(document.createElement("a"));
      machinelink.attr('href', 'javascript:void(0)');
      machinelink.text(data.machine);
      item.append(machinelink);
      machinelink.after(' depuis ' + new Date(data.date).toLocaleString());


      if (! main_object.machine2shares.hasOwnProperty(data.machine)) {
        main_object.machine2shares[data.machine] = [];
      }
      nextindex = main_object.machine2shares[data.machine].length;
      main_object.machine2shares[data.machine][nextindex] = shortname;

      userlist.append(item);

      opensublist = function(){
        var subitem;
        if (item.populated !== undefined) {
          return this;
        }
        newlist = $(document.createElement("ul"));
        $.each(main_object.machine2shares[data.machine], function(index, thismachine_share){
          subitem = MH.htmlnode('li')
            .text(thismachine_share)
            .appendTo(newlist);
        });
        newlist.click(removesublist);
        machinelink.one('click', removesublist);
        item.append(newlist);
        item.populated = true;
      };
      removesublist = function() {
        newlist.remove();
        delete item['populated'];
        machinelink.one('click', opensublist);
      };
      machinelink.one('click', opensublist);
    });
    return userlist;
  },
  tableskel: function(headers) {
    var col, colgroup, titlerow, table;
    table = $(document.createElement("table"));
    table.addClass("sharestable");

    colgroup = $(document.createElement("colgroup"));
    titlerow = $(document.createElement('tr')).addClass("titlerow");

    $.each(headers, function(index, value) {
      col = $(document.createElement("col"))
      .addClass("col" + index)
      .attr('span', '1');
      colgroup.append(col);

      col_title = $(document.createElement('th')).text(value);
      titlerow.append(col_title);

    });

    table.append(colgroup).append(titlerow);

    return table;
  },
  mkcell: function(txtcontent) {
    return $(document.createElement("td")).text(txtcontent);
  },
  mklocklist: function(locklist, shortname) {
    var lockstable = SambaLib.tableskel(["type", "mode", "date", "Nom du fichier"]);
    $.each(locklist, function(index, data) {
      var rw, row;
      if (data.rw !== "RDONLY") {
        rw = "rw";
      } else {
        rw = "r";
      }
      row = MH.htmlnode('tr')
        .append(SambaLib.mkcell(data.denyMode))
        .append(SambaLib.mkcell(rw))
        .append(SambaLib.mkcell(new Date(data.date).toLocaleString()))
        .append(SambaLib.mkcell(data.filename))
        .appendTo(lockstable);
    });
    return lockstable;
  },
  detailsdiv: function(shortname, explanationtxt, mainitem) {
    var sharedetaildiv, sharenamebis;
    sharenamebis = MH.htmlnode('h3')
      .text(shortname, shortname);
    sharedetaildiv = MH.htmlnode('div')
      .addClass("userlist")
      .append(sharenamebis)
      .append(mainitem);
    explanation = MH.htmlnode('span')
      .addClass("explanation")
      .text(explanationtxt)
      .appendTo(sharedetaildiv);
    return sharedetaildiv;
  },
  sharestable: function(server) {
    var main_object = this;
    var sharestable = SambaLib.tableskel(["Nom du partage", "Utilisateurs", "Fichiers verrouillés", ""]);

    $.each(server.data.status, function(sharename, clients) {
      var clientlist, locklist, has_locks;
      server.shares[sharename] = {};
      server.shares[sharename].locksnb = 0;
      if (clients.machines !== undefined ) {
        clientlist = clients.machines;
        locklist = clients.locked_files;
        has_locks = true;
      } else {
        // backwards compat
        clientlist = clients;
        has_locks = false;
      }
      var nb, row,
      sharecell, userscell, detailscell,
      sharespan, sharedetaildiv,
      userlist, sharelocksdiv,
      label, shortname;

      nb = 0;
      for (attribute in clientlist) {
        nb++;
      }

      if (has_locks) {
        for (attribute in locklist) {
          server.shares[sharename].locksnb++;
        }
      } else {
          server.shares[sharename].locksnb = 'Not available yet';
      }
      row = $(document.createElement('tr')).addClass("sharerow");
      sharecell = $(document.createElement('td')).text(sharename).addClass("sharecell");
      row.append(sharecell);


      if (nb <= 1) {
        label = " utilisateur";
      } else {
        label = " utilisateurs";
      }
      userscell = SambaLib.clickabletd(nb + label, "userscell", "Afficher le nombre d'utilisateurs");
      row.append(userscell);

      if (server.shares[sharename].locksnb == 0) {
        locktitle = "Aucun verrou à afficher";
      } else {
        locktitle = "Afficher les verrous";
      }

      lockscell = SambaLib.clickabletd(server.shares[sharename].locksnb, "lockscell", locktitle);
      row.append(lockscell);

      shortname = server.shortname + ' / '+ sharename;
      userlist = SambaLib.mkuserlist.apply(main_object, [clientlist, shortname]);
      sharedetaildiv = SambaLib.detailsdiv(
        shortname,
        "Cliquer sur un nom de machine pour afficher et masquer alternativement les partages auxquels elle accède",
        userlist
      );

      if (has_locks) {
        locklist = SambaLib.mklocklist(locklist, shortname);
        sharelocksdiv = SambaLib.detailsdiv(
          shortname,
          "Liste des verrous",
          locklist
        ).addClass('locks');
      }

      detailscell = $(document.createElement('td'));
      detailscell.append(sharedetaildiv);
      if (has_locks) {
        detailscell.append(sharelocksdiv);
      }
      row.append(detailscell);
      sharestable.append(row);

      // animations
      userscell.click(function() {
        $('div.overall').fadeIn();
        sharedetaildiv.fadeIn();
        sharedetaildiv.center();
        row.addClass("selected");
      });
      if (has_locks && server.shares[sharename].locksnb >= 1) {
        lockscell.click(function() {
          $('div.overall').fadeIn();
          sharelocksdiv.fadeIn();
          sharelocksdiv.center();
          row.addClass("selected");
        });
      }
    });
    return sharestable;
  },
  showshares: function(server) {
    for (attribute in server.data.status) {
      server.sharenb++;
    }

    if (server.sharenb !== 0) {
      return SambaLib.sharestable.apply(SambaLib.app, [server]);
    } else {
      return "(pas d'utilisateur connecté)";
    }
  },
  showspace: function(server, uniqueindex) {
    /* this is d3.js, not jquery, so we run this after
       everything has been appended to the DOM
    */
    if (server.container == undefined) {
    	return server;
    }
    console.log("gauge for server " + server.name);
    var container = MH.htmlnode("span").attr('id', server.name + '_diskspace');
    server.datadiv.append(container);

    var mountlist = MH.htmlnode('ul');
    $.each(server.data.avail_space.mount_points, function(directory, mountpoint){
      mountlist.append(MH.htmlnode('li').text(directory + ' monté en ' + mountpoint));
    });
    server.datadiv.before(mountlist);
    $.each(server.data.avail_space.disk_usage, function(mountpoint, data){
      percent = 100 * data.used / data.total;
      elt_id = "diskspace" + uniqueindex;
      var totalGb = data.total / 1048576;
      var usedGb = data.used / 1048576;
      var availableGb = data.available / 1048576;
      container.append(
      	MH.htmlnode("span")
	.attr('id', elt_id)
	.addClass('gauge')
	.attr('title',
		totalGb.toFixed(2) + 'Go dont ' + usedGb.toFixed(2)
		+ 'Go utilisés et ' + availableGb.toFixed(2) + 'Go disponibles'
		)
      );
      createGauge(elt_id, mountpoint, mountpoint, 0, 100).redraw(percent);
    });
    return server;
  },
  serverinfo: function(servername, serverdata) {
    var main_object = this;
    var server = {
      name: servername,
      shortname: servername.replace(/\..*/g, ''),
      sharenb: 0,
      shares: {},
      data: serverdata,
      container: undefined,
    };

    if (server.data.in_error == true) {
      console.log('Ignoring server ' + server.name);
    } else {
      var splitname = server.shortname.split('-', 3);
      server.role = splitname[0];
      server.site = splitname[1];
      if (this.roles.indexOf(server.role) == -1) {
        this.roles.push(server.role);
      }
      if (this.sites.indexOf(server.site) == -1) {
        this.sites.push(server.site);
      }
      server.container = $(document.createElement("div"))
      .addClass("server")
      .addClass("role-" + server.role)
      .addClass("site-" + server.site)
      .append(
        $(document.createElement("h3"))
          .append(
            $(document.createElement("img"))
              .attr('src', 'server.png')
              .attr('hight', '"30"')
            )
          .append(
            $(document.createElement("span"))
              .text(server.name)
            )
      );
      server.datadiv = MH.htmlnode('div');
      sharespan = MH.htmlnode('span').css('float', 'left');
      sharespan.append(SambaLib.showshares.apply(SambaLib.app, [server]));
      server.datadiv.append(sharespan);
      server.container.append(server.datadiv);
      server.container.id = server.name;

      this.sambacontainer.append(server.container);
    }
    return server;
  },
  ensite: function() {
    var jthis = $(this);
    SambaLib.sites_enabled.append(this).append(' ');
    jthis.unbind('click');
    jthis.click(SambaLib.dissite);
    SambaLib.sitefilter();
  },
  dissite: function() {
    SambaLib.sites_available.append(this).append(' ');
    $(this).unbind('click');
    $(this).click(SambaLib.ensite);
    SambaLib.sitefilter();
  },
  sitefilter: function() {
    if (SambaLib.sites_enabled.text().trim() == '') {
      $("div.server").show();
    } else {
      var allowed = [];
      $.each($("div#sites div.filterenabled span.filter"), function(index, item){
        allowed.push($(item).text().trim());
      });
      $("div.server").hide();
      $.each(allowed, function(index, item){
        $("div.site-" + item).show();
      });
    }
  },
  reset: function() {
    $("div.autofill").empty();
    $("div.filteravailable, div.filterenabled").empty();
    this.machine2shares = {};
    this.roles = new Array();
    this.sites = new Array();
  },
  setup: function(data) {
    this.reset();
    var servers = [];

    $.each(data, function(key, val) {
      servers.push(SambaLib.serverinfo.apply(SambaLib.app, [key, val]));
    });

    $('td').hover(function() {
      var t = parseInt($(this).index()) + 1;
      $(this).parent().parent().find('td:nth-child(' + t + ')').addClass('highlighted');
    },
    function() {
      var t = parseInt($(this).index()) + 1;
      $(this).parent().parent().find('td:nth-child(' + t + ')').removeClass('highlighted');
    });

    this.sites.sort();
    $.each(this.sites, function(index, site) {
      var label = $(document.createElement("span"))
      .addClass("filter")
      .addClass("avail")
      .text(site);
      var link =  $(document.createElement("a"))
      .attr('href', 'javascript:void(0)')
      .append(label);
      SambaLib.dissite.call(link, [SambaLib.app,]);
    });

    $.each(servers, function(index, server) {
      SambaLib.showspace.apply(SambaLib.app, [server, index]);
    });
  },
  refresher: function() {
    $.getJSON('samba_summary.json').done(
      function(data) {
        SambaLib.setup.apply(SambaLib.app, [data]);
      }
    ).fail(
      function(data, txtstatus, error) { console.log('fail - status: ' + txtstatus + ' error: ' + error + ' data:' + JSON.stringify(data)); }
    ).always(
      function(data) { console.log('always'); }
    );
  },
  bindall: function() {
    if (SambaLib.bound) {
      return this;
    }
    $(SambaLib.selectors.overall).click(
      function() {
        $(SambaLib.selectors.overall).fadeOut();
        $("tr.selected").removeClass("selected");
        $("div.userlist").fadeOut();
      });
    SambaLib.bound = true;
    return this;
  },
};

function Sambascript () {
  'use strict';
  this.jqpatched = false;
  this.start = SambaLib.start;
  this.reset = SambaLib.reset;
  this.refresh = SambaLib.refresher;
  this.sambacontainer = $(SambaLib.selectors.target);
  SambaLib.sites_available = $(SambaLib.selectors.sites_available);
  SambaLib.sites_enabled = $(SambaLib.selectors.sites_enabled);
  SambaLib.app = this;
};

SambaLib.bindall();
