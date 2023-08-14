---
title: "Experimenting With Linux and Docker"
date: 2021-11-30
tags: ["Projects", "Linux", "Docker", "Homelab"]

cover: "~/assets/cargo-ship-aerial-view.jpg"
coverAlt: "Aerial view of container ship"
---

Hi Internet, this is my first blog post about some of the cool things I have recently been experimenting with. I wanted to have a record of the projects I'm doing in my free time, and to be able to show it to others. Without further ado, let's get right into it.

## The Origins of this Project

At the beginning of 2021, I got interested in mining cryptocurrency. I wasn't doing it for the money, I just thought that it was cool that I could sell my computing power. Using a program called [NiceHash](https://www.nicehash.com/) on my main computer, I mined Ethereum with my AMD Radeon RX 5600 XT in the background.

I realized that we had a spare prebuilt computer that we hadn't used in a few years. We had previously used it as a Family Computer, but as my Dad and I bought our own laptops and I later built a computer, nobody used it anymore. I took it upon myself to find a graphics card on Facebook Marketplace and fix up the old prebuilt. I also had to purchase a new power supply for the computer, as the one it shipped with was not capable of supporting the NVIDIA GeForce GTX 1070.

It turns out that the power button on the case the prebuilt came in was broken, and I spent the longest time trying to figure out why the computer wouldn't turn off after upgrading the graphics card and power supply. I didn't feel like buying a new power button, so I just turned it on by shorting two of the pins on the motherboard with a screwdriver. Funnily enough, this is how I still do it today.

When it came to putting in a new drive and installing an OS, I was forced into running Windows 10 as that was the only platform supported by NiceHash's software.

## Using Docker for the First Time

Eventually, around July of that same year, I stopped mining on both of these computers altogether. The electricity costs, coupled with the excess heat generated in the summer, were enough reasons for me to quit.

While I didn’t use that computer for a few months, another idea became apparent to me. I had recently been learning about [Docker](https://www.docker.com/), which lets you run programs in lightweight virtualized environments without the same overhead as virtual machines.

Now, what was I to run? I had watched a [video by NetworkChuck](https://youtu.be/gsvS2M5knOw) a few months prior about [Apache Guacamole](https://guacamole.apache.org/), a program that allows for SSH, VNC, and RDP sessions directly from your web browser. This seemed like a perfect fit as I had also recently configured a web server on my Raspberry Pi with a [trivia game](https://github.com/zsrobinson/trivia) I created several months ago. I configured the Pi from my main computer over an SSH connection and thought it would be cool to see if I could run Apache Guacamole on that spare computer to host an SSH connection to the Pi. My main computer would communicate with the Guacamole server via HTTP, and then the server would communicate with the Pi over SSH.

Once I had downloaded Docker Desktop for Windows, it was fairly easy to set up Guacamole. Traditionally, Guacamole is meant to be run as three separate containers on Docker, but with the [onzu/guacamole Docker image](https://hub.docker.com/r/oznu/guacamole), these were all combined into one. This made it much easier to fire up the image, create a new user, add connections, and be on your way. And without getting into the nitty-gritty, that's basically what I did.

## Transition to Linux

However, I had a little problem on my hands. So little that it didn't even really matter. I was running Windows on that machine instead of Linux. The NiceHash software that requires Windows was no longer run on that computer, so I was free to use whatever OS I wanted, as long as it supported Docker. Before this point, the only real experience I got with Linux was from a few commands I learned from the first semester of my class at CAT-South, some Virtual Machines on my main computer here and there, and demoing a few distros on a Live USB. So what better way to learn it than jump headfirst into it?

I ended up going with [Linux Mint](https://linuxmint.com/) for a few reasons. It seemed beginner-friendly enough and is based on Ubuntu. While in retrospect it was somewhat of an arbitrary decision, I don't regret it over another distro such as [Manjaro](https://manjaro.org/) or [Ubuntu](https://ubuntu.com/). I like their desktop environment Cinnamon, but past the initial config, I didn't touch the GUI much.

## Initial Struggles

One of the first things I did was set up SSH, which was easy enough. It only took a few commands, and with the help of a [guide from DevOpsPoints](https://devopspoints.com/linux-mint-accessing-your-system-via-ssh.html), I got it up and running in no time. However, I didn't anticipate the complicated mess of VNC on Linux. It is possible that there is an easy way to do it and I was just not aware of it as a beginner to Linux. However, every tutorial I tried seemed to have some sort of error, and after hearing about some arbitrary 8 character password limitation, I gave up trying to use VNC.

I read a [post by u/nyc13f](https://www.reddit.com/r/sysadmin/comments/q93l6f/why_is_headless_vnc_server_such_a_pain_to_setup/) about the issues surrounding VNC that seemed to echo a lot of the frustrations I had as well. u/Acceptable_Repeat908 had commented on the post that an alternative was to use a program called xRDP. After looking into it a little bit and finding a [guide by RootIsGod](https://www.rootisgod.com/2020/Using-RDP-With-Linux-Mint-20-Cinnamon/) for it, I was more than thankful to learn that it only used two commands to set up:

```bash
sudo apt install xrdp xorgxrdp -y
echo env -u SESSION_MANAGER -u DBUS_SESSION_BUS_ADDRESS cinnamon-session>~/.xsession
```

I also had to enable the port on my firewall with `sudo ufw allow 3389`, but I was amazed that this was so easy to set up after struggling for so long with VNC. [xRDP](http://xrdp.org/) uses the Microsoft proprietary Remote Desktop Protocol (RDP) to establish the remote desktop session. You are even able to access a Linux machine running xRDP with the built-in Remote Desktop Client in Windows, which was surprising to me.

While I used SSH for almost everything else I am going to mention on this guide, it was nice to be able to access the Desktop Environment of my machine from my main computer if I needed to, as they're on different floors of my house.

## Docker on Linux

The next order of business was to set up Guacamole again on this new operating system. The [Docker Docs](https://docs.docker.com/engine/install/debian/) were very helpful in this regard, and installing Docker for the first time was as easy as a few commands:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Along with that, I also had to add my user to a group so that I wouldn't need root access to run Docker commands. From there, running Apache Guacamole wasn't too difficult either, I just had to get used to starting the container through the command line instead of with Docker Desktop. I was able to connect to this computer using RDP and SSH through my browser with Guacamole.

## Containers for Days

I didn't stop after running Guacamole on Docker, however. I ran [Pi-hole](https://pi-hole.net/) as a DNS Server for my home network, blocking domains often used for tracking and advertisements. In conjunction with Local DNS Entries I set in Pi-hole, I used [Nginx Proxy Manager](https://nginxproxymanager.com/) to allow me to access resources running on Docker with an easy-to-remember domain name (`guac.zsrobinson.com`), as opposed to an IP address with a port listed at the end ( `192.168.1.51:8083`). Along with that, I ran [Portainer](https://www.portainer.io/) to allow me to configure Docker through a web interface, which was helpful as I was still learning some of the commands for Docker. I also ran some games on containers, with [Tetris](https://github.com/bsord/tetris) and [Adventure](https://github.com/ianblenke/docker-adventure) both being hosted on my local network.

I didn't run into many hiccups along this way, besides a few minor issues. For example, I had to stop and disable systemd-resolved, which seemed to be messing up Pi-hole, as it was already using one of the ports that it requires. But this was as simple as running `sudo systemctl stop systemd-resolved` and `sudo systemctl disable systemd-resolved`. I also had to enable all the ports used by these containers on my firewall, which gave me a headache figuring out what was wrong when I forgot to do so for one of the images. Finally, the Adventure image that I had run uses [WebSockets](https://en.wikipedia.org/wiki/WebSocket) to communicate with the server that is running the game. The game was working when I directly accessed its IP, but not with a domain name. The console tab of Inspect Element mentioned something about not being able to access a domain that started with `ws://`. It turned out that I just had to enable WebSockets for that Proxy Host in Nginx Proxy Manager, which was as simple as flipping a check box.

## Conclusion

Overall, this whole experience has been very beneficial and has allowed me to learn (or at least dip my toes into) many different aspects of the world of IT. This whole process started with me learning about cryptocurrencies and I ended up having to deal with WebSockets. I never would have learned everything that I did with this project if I had just sat down and said "alright I want to learn how to configure remote desktop protocols on Linux today". There's something to be said for learning about tech through _doing_, not just reading.

Dealing with WebSockets made me want to mess around with them even more, and I am thinking about coding a program of some sort that uses them sometime soon. There is still so much more I could do with the setup I have right now, and I'm not planning on stopping experimenting with it anytime soon.
