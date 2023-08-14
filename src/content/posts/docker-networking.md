---
title: "Docker Networking"
date: 2022-08-14
tags: ["Projects", "Docker", "Networking", "Homelab", "Cybersecurity"]

disclaimer: "This was a draft post I found when upgrading my site from Hugo, and it may be a bit verbose. I figured I'd make it public because what I talked about here was still pretty interesting."
---

As I’ve talked about in other posts, Docker is an amazing tool to virtualize applications without the traditional overhead associated with virtual machines. Naturally, the networking options in Docker are just as amazing. There are many different options for networking in Docker, such as bridge, host, overlay, ipvlan, macvlan, or even none. For a great rundown on these types, consider watching [this video by NetworkChuck](https://youtu.be/bKFMS5C4CG0). But today, I’d like to walk you through how I’ve addressed [^1] Docker networking in my own home lab.

[^1]: Get it? Addressed? Networking? Sorry...

One of the most important concepts in networking is network isolation. Within a network, many Layer 2 attacks can be used that could compromise the applications running on our networks. Spanning Tree Protocol Attacks, Address Resolution Protocol Attacks, MAC Address spoofing, VLAN hopping, and DHCP spoofing [^2] are just a few off the top of my head. To guard against this, we can separate our network into individual subnets that require Layer 3 routing to communicate. For example, many networking enthusiasts will have separate networks for their main devices and IoT devices, as many of these IoT devices could have malicious code running on them. By isolating them into their own subnet (and even further with ACLs), we can prevent against these attacks.

[^2]: While _technically_ DHCP is an Application level protocol, it will only work within a single broadcast domain, or in other words, a single subnet. That is, of course, unless there is any forwarding of the DHCP packets by the router, like with the `ip helper-address` interface configuration command for Cisco IOS. For more on this type of attack, read [this post](/posts/dhcp-spoofing-attacks) I wrote a few months back.

The same goes for Docker. It’s important to consider how our networks are designed for security reasons, even in our Docker environment.

Many Docker images use HTTP rather than HTTPS, which is a glaring vulnerability. Even if these images use HTTPS, they have to use self-signed certificates, which will still display as insecure in your browser unless the keys are added to each computer trying to access the website. While using HTTP over your local network is _fine_, it’s not ideal -- and especially if you’re going to open up any resources to the Internet, HTTPS is a must.

We can use a reverse proxy to combat this. If you have a local DNS server (perhaps using Pihole on Docker), you can assign your server's IP address a domain name. This allows you to type, for example `homelabserver.com:8080` instead of `192.168.10.50:8080` to access a theoretical website running on Docker with port 8080 exposed.

While it's nice to not type in the IP address, it's still annoying to worry about the port number -- and we still don't have HTTPS!

This is where the reverse proxy comes in. For each request coming into port 80 or 443 (HTTP or HTTPS) on the server, the reverse proxy will look at the domain it's requesting, and forward that request to another host. But it gets even better. If we put the reverse proxy container and the proxied containers in the same bridge network, we can just put in the name of the container for the redirect host, since Docker does some DNS magic behind the scenes.

For instance, say we have a container hosting a game of Tetris for your browser. We first create a DNS record so that `tetris.com` points to the IP address of the server. Then, we put the Tetris container and the reverse proxy container in the same bridge network. There can be as many containers in this network for each resource that you want to be proxied. Now, we can create a proxy host within the reverse proxy, and specify `tetris` for the hostname/IP address, assuming that the Tetris container is named "tetris". Also, assuming that the Tetris container is hosting this game over port 80 with HTTP, we can set the port and scheme settings respectively. Now as long as port 80 is exposed on the reverse proxy container (with `-p` for Docker run or the `ports:` keyword for Docker compose), then the request will be correctly forwarded when `tetris.com` is typed into the browser.

That was a mouthful, but it's not even the best part. By using this reverse proxy as a middleman, we don’t only get to have custom domains without specifying port numbers, but we also get to apply HTTPS to our normally unencrypted services.

Within Nginx Proxy Manager (my preferred image for reverse proxies), we can use Let’s Encrypt to create a wildcard certificate for any of the domains we would like to use. To create this wildcard certificate, it’s important that we use a Fully Qualified Domain Name (FQDN), meaning that we actually have control over the DNS for that domain. Since I own the domain `zsrobinson.com`, I have all of these local sites as subdomains under `home.zsrobinson.com`, such as `tetris.home.zsrobinson.com`. While the domain name is unique across the Internet, users in my own local network that use my own local DNS server are still the only ones that can access the site.

When specifying the domains we want for our wildcard certificate, we could say, for example, `home.zsrobinson.com, *.home.zsrobinson.com`, meaning that it will apply to any domain that ends with, or is, `home.zsrobinson.com`. It gets it's name from the use of the wildcard symbol (`*`).

To verify that the domain is actually a FQDM, LetsEncrypt requires a DNS challenge where we provide an API key to the DNS provider that controls our domain (Cloudflare, Google Domains, GoDaddy, etc). This just amounts to the verification process adding a unique text record to our base domain name, and then requesting that text record to the domain name we _say_ we control to make sure we actually do control it.

All of this hassle gives LetsEncrypt the verification it needs to provide a wildcard certificate to our reverse proxy, without needing to upload any special cryptographic keys to our clients to prevent getting a warning in our browser. It just works.

In practice, this all amounts to an isolated network for my proxied Docker containers with SSL certificates for all of my web resources. Even if a container tried to access a device on my main network directly, this device in question couldn’t communicate back with the container as my home router has no route to the network within Docker.

I want to keep experimenting with networking in Docker in the future, and there may be a more secure option than the one I’m currently using. The macvlan and ipvlan options seem like pretty powerful settings, so I’d like to try using those for some of my containers in the future.
