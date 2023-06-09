---
title: "Is the Future of Computing a Future We Want?"
date: "2022-06-17"
categories: ["Opinions"]
tags: ["Computing"]
---

In the year 2022, the average technology consumer has many different computing devices. One person, assuming they have the means to afford such devices, may own a Phone, Tablet, Laptop, and Desktop Computer, just to name a few of the devices many use in their daily lives. But as the tech industry is able to fit more computing power into smaller form factors, it raises an interesting dilemma. At what point is the computing power of our phones enough to power our desktop computers?

Typically, we associate the size of a device with its computational power – and this is still largely true. An Apple Watch is going to have less power than a MacBook because there is less room for components on your wrist compared to a 13” laptop. However, the gaps between these devices are starting to decrease. Take, for example, the newest [iPad Pros](https://support.apple.com/kb/SP843?locale=en_US). These devices feature the same M1 chips that can be found on anything from a [MacBook Pro](https://support.apple.com/kb/SP824?locale=en_US) to a [Mac mini](https://support.apple.com/kb/SP823?locale=en_US) desktop computer. This same M1 chip was [based on the architecture](https://www.pcmag.com/news/what-is-the-apple-m1-chip) of the A series of chips used within iPhones for years. The lines between these devices are blurring, with the main differences really just boiling down to form factor.

This begs the question: why should we pay for multiple devices with similar computing power when this power could just be shared between these devices? In other words, what if we allowed just one, for example, M1 chip to power our phones, and then hook our phones up to our desktop computers to harness that same power in a different form factor?

## Method 1: Plug n’ Play

The first method for this revolutionized system of computing is what I’m going to refer to as “Plug n’ Play”. This method entails one device (such as a phone) with an adequate amount of computing power being used in different form factors via different devices. For example, your iPhone could be slotted into what looks like a MacBook but is just a keyboard, trackpad, screen, and possibly even a battery to extend your phone’s lifespan. This “shell” of a device would allow us to harness the same computing power of our phone, but with a larger screen and a more comfortable keyboard. And when you come home at the end of the day, your phone could be plugged into the “shell” of a Mac mini to allow for video output and external keyboard and mouse functionality.

This vision isn’t one of fiction, but rather it’s already here. At CES 2018, Razer introduced [Project Linda](https://www.razer.com/concepts/project-linda), a concept for this type of “plug n’ play” computing.

![Razer Project Linda](https://zsrobinson.com/posts/future-of-computing/images/project-linda.jpg)

This concept (pictured above) presented what Razer called the “best of both worlds”. You could use your Razer Phone on the go just like any other smartphone, but as soon as you needed a laptop form factor, you could slot your phone into where a trackpad would traditionally be. Then, you could use your phone in this larger form factor for uses that benefit from a larger screen and keyboard, such as watching videos and responding to emails.

![Samsung Dex](https://zsrobinson.com/posts/future-of-computing/images/samsung-dex.jpg)

A similar idea is available on many Samsung phones today, called [Samsung Dex](https://www.samsung.com/us/explore/dex/) (shown above). This allows you to dock your phone into a little stand, where you can connect up a monitor, keyboard, and mouse for a more comfortable experience.

Similarly, technologies such as Apple CarPlay allows consumers to access the features of their iPhone via the form factor of a car – all without having to put the components of an iPhone within the car itself. Rather, your phone can just be plugged into a compatible car to gain much of the computing power and features of your phone.

If this method of shared computing is brought into the mainstream, it could be a great way to optimize your existing computing power between devices of many form factors. Just imagine the popularity of such a technology if a company like Apple integrated it into its core product line.

_But what about the poor corporations?_ It would cost significantly less for a consumer to just buy an iPhone with a few of these “shell” devices than to buy an iPhone, iPad, MacBook, and Mac mini. While the argument could be made that this could tap an underserved market, the about of revenue lost by such a proposal makes it extremely unlikely for any major tech company to go all-in on.

## Method 2: Cloud Computing

Due to the lack of profit incentive for the “plug n’ play” method, I’m skeptical that it will win over cloud computing. By cloud computing, I’m not talking about dropping some files in your Google Drive or editing videos on an online platform such as WeVideo. Instead, I’m talking about a method in which your entire computer is in the cloud, with your actual devices just acting as clients to access your cloud provider’s servers — Computing as a Service, if you will.

The enterprise world is starting to embrace this method, with many companies opting to give their work-at-home employees “thin clients” to access the company’s servers over, most likely, a VPN connection. These [thin clients](https://en.wikipedia.org/wiki/Thin_client) are stripped down computers with the main purpose of establishing a remote desktop connection to a server. For an enterprise, this has the advantage of removing the risk of employees losing or damaging their company devices, possibly destroying or releasing confidential data to the public.

What if this concept of thin clients was expanding to personal computing as well? In this method, what used to be your iPhone, iPad, MacBook, or Mac mini could all just be these stripped down devices with the purpose of connecting to a server to harness a greater amount of computing power. If you lose your phone, it’s no problem! Just buy another thin client and log into your account.

![Shadow Cloud Computing](https://zsrobinson.com/posts/future-of-computing/images/shadow.png)

[Shadow](https://shadow.tech) is a company that promises something similar to this. They allow you to have access to your own Windows PC in the cloud that you can access from anywhere starting at around $30 per month (shown above). Instead of someone purchasing, for example, a gaming computer to play graphically demanding games, they can just use an underpowered thin client to access their cloud computer with much more processing power.

Personally, I’ve set up something similar to this method in my own workflow. I don’t own a laptop to take on the go and work on, for example, programming projects — but I _do_ have an iPad Pro. On its own, this device doesn’t really allow me to code. But with a docker container called [code-server](https://hub.docker.com/r/linuxserver/code-server) running on my server at home, I’m able to access an instance of VSCode from anywhere. As long as I’m able to establish a VPN connection to my home network (I don’t want to open port 80 or 443 on my router for security reasons), I’m able to code. And the best part is that I didn’t need any special computer for this; I simply used an old desktop computer and [ran Linux and Docker on it](https://zsrobinson.com/posts/experimenting-with-linux-and-docker/). Otherwise, this computer would just be collecting dust in my basement.

However, it’s clear that if this method of shared computing is made widestream, anti-consumer practices would also be made widespread. With the trends over the last decade of increasingly locking consumers into closed ecosystems and preventing interoperability, it may be difficult to justify the apparent advantages of this method.

For example, if you bought your thin clients from Microsoft, it’s probable that they would force you to use Microsoft’s cloud computing servers. Worse, if you wanted to self host your remote desktop server using a device that you own and control, this may be impossible. To not have the ability to control your own data and processing power is certainly troubling. Unless standards are made and this method is regulated to allow for more consumer choice, this could quickly devolve into companies holding your data hostage.

## The Future of Computing

Do we really want any of this? A future where we’re locked into a certain company’s cloud computing services? A future where the concept of “plug n’ plug” computing is discarded just because companies can’t squeeze a few extra dollars out of you? The downsides of these shared computing models are great, but if executed successfully, the advantages are massive.

As much of the world becomes increasingly environmentally conscious, both of these methods would allow for less [e-waste](https://en.wikipedia.org/wiki/Electronic_waste) to be produced. Less chips needed to be used in the “plug n’ play” method decreases the impact of devices landing in the landfill. Likewise, if you no longer need cloud computing services from a specific company, this computing power can simply be allocated to another customer.

Furthermore, the model of cloud computing would allow for consumers to scale up and down their computing resources as their computing needs fluctuate. For instance, a consumer that mainly checks emails and watches Netflix could rent a lower amount of computing power, and then rent more for the day that they have to edit a video for a school project.

The future of computing is exciting and could be the solution to many problems we’ve faced with the traditional method of a device’s computing power being integrated into the device itself. It ultimately depends on whether we let companies take advantage of this revolution to push anti-consumer practices on us, or we pressure these companies with our dollars and votes to make the future that is most beneficial for all of us.
