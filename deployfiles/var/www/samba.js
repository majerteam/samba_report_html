// The --static flag allows for valid json
// salt '*' samba_users.stats --out=json --static --out-file=samba_summary.json

// requires filter.js
// requires myhtml.js

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
  start: function() {
    if (this.jqpatched) {
      console.log("Sambascript already installed");
    } else {
      jQuery.fn.center = SambaLib.jq_center;
      this.jqpatched = true;
    }
    this.reset();
    FilterLib.register_refresh(this.refresh);
    FilterLib.refresh();
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
          subitem = htmlnode('li')
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
      row = htmlnode('tr')
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
    sharenamebis = htmlnode('h3')
      .text(shortname, shortname);
    sharedetaildiv = htmlnode('div')
      .addClass("userlist")
      .append(sharenamebis)
      .append(mainitem);
    explanation = htmlnode('span')
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
    var container = htmlnode("span").attr('id', server.name + '_diskspace');
    server.datadiv.append(container);

    var mountlist = htmlnode('ul');
    $.each(server.data.avail_space.mount_points, function(directory, mountpoint){
      mountlist.append(htmlnode('li').text(directory + ' monté en ' + mountpoint));
    });
    server.datadiv.before(mountlist);
    $.each(server.data.avail_space.disk_usage, function(mountpoint, data){
      percent = 100 * data.used / data.total;
      elt_id = "diskspace" + uniqueindex;
      var totalGb = data.total / 1048576;
      var usedGb = data.used / 1048576;
      var availableGb = data.available / 1048576;
      container.append(
      	htmlnode("span")
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
      server.datadiv = htmlnode('div');
      sharespan = htmlnode('span').css('float', 'left');
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
new Sambascript().start();
