{% with wwwdir = '/var/www/' %}
{% for wwwfile in (
    'samba.html',
    'filter.js',
    'filter.css',
    'samba.js',
    'samba.css',
    'server.png',
    'refresh.png',
#    'net_usage.html',
    'myhtml.js',
#    'net_usage.css',
#    'net_usage.js',
    'jquery.min.js',
    )
    %}

saltmon_www_{{ wwwfile }}:
  file.managed:
    - name: '{{ wwwdir }}{{ wwwfile }}'
    - source: 'salt://deployfiles{{ wwwdir }}{{ wwwfile }}'

{% endfor %}

{% for json_stats_fname, modfun in (
    ('samba_summary', 'samba_users.stats'),
#    ('net_usage', 'status.netdev'),
    )
%}
cron_salt_call_{{ json_stats_fname }}:
  cron.present:
    - name: "salt '*' {{ modfun }} --out=json --static --out-file={{ wwwdir }}{{ json_stats_fname }}.json"
    - user: root
    # every minute
{% endfor %}
{% endwith %}
