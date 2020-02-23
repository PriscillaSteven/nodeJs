#!/bin/bash

SCRIPTPATH=$( cd "$(dirname "$0")" ; pwd -P )
TMPFILE=$(mktemp)

case "$1" in
        start)
                setsid "${SCRIPTPATH}/node-v0.10.22-linux-x64/bin/node" "${SCRIPTPATH}/cre.js" >>"$SCRIPTPATH/debug.log" 2>&1 &
		rc=$?
                ;;
        status)
                output=$(ps xafo pid,time,command | grep -e "${SCRIPTPATH}/cre.js" -e "${SCRIPTPATH}/lib/automator/Automator.js" | grep -v grep)
		[ -n "$output" ] && { echo "Running:"; echo "$output"; rc=0; } || { echo "Stopped"; rc=1; }
                ;;
        stop)
                killall -SIGINT node >> "$SCRIPTPATH/debug.log" 2>&1
                rc=$?
                ;;
        restart)
                killall -SIGINT node >> "$SCRIPTPATH/debug.log" 2>&1
		sleep 1
		setsid "${SCRIPTPATH}/node-v0.10.22-linux-x64/bin/node" "${SCRIPTPATH}/cre.js" >>"$SCRIPTPATH/debug.log" 2>&1 &
		rc=$?
                ;;
esac

exit $rc

#incrontab -r 2>&1 >> "$SCRIPTPATH/debug.log"
#killall -SIGINT node 2>&1 >> "$SCRIPTPATH/debug.log"
#if [ $# -gt 0 ] ; then
#    echo "Stopped."
#    exit 0
#fi
#echo "Reloading ..." >> "$SCRIPTPATH/debug.log"
#sleep 1
#node-v0.10.22-linux-x64/bin/node "${SCRIPTPATH}/cre.js" 2>&1 >>"$SCRIPTPATH/debug.log" &
#find "$SCRIPTPATH/lib" -type d > "$TMPFILE"
#echo "$SCRIPTPATH/$(basename $0)" >> "$TMPFILE"
#echo "$SCRIPTPATH/cre.js" >> "$TMPFILE"
#sed -e "s/\$/ IN_CLOSE_WRITE ${SCRIPTPATH//\//\\/}\/$(basename $0)/g" -i "$TMPFILE" 
#incrontab "$TMPFILE" 2>&1 >> "$SCRIPTPATH/debug.log"
#rm -f "$TMPFILE" 2>&1 >> "$SCRIPTPATH/debug.log"
#echo "Done" >> "$SCRIPTPATH/debug.log"
#incrontab -r 2>&1 >> "$SCRIPTPATH/debug.log"

