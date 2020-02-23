#!/bin/bash

yum -y install epel-release
yum -y install xrdp
chkconfig xrdp on
service xrdp start

sed -i.bak -e "s/^HWADDR/#HWADDR/" /etc/sysconfig/network-scripts/ifcfg-eth0
