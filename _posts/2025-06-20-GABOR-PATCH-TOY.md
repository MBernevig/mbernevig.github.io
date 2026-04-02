---
title: Gabor Patch Toy
description: A simple Godot project that guides users through the process of creating motion metamers using Gabor patches.
date: 2025-06-20 00:00:00 +0800
categories: [Game Development, Godot]
tags: [godot, gabor patch, motion metamers, computer graphics, foveated rendering, interactive]
pin: true
math: true
mermaid: true
# image:
#   path: /commons/devices-mockup.png
#   lqip: data:image/webp;base64,UklGRpoAAABXRUJQVlA4WAoAAAAQAAAADwAABwAAQUxQSDIAAAARL0AmbZurmr57yyIiqE8oiG0bejIYEQTgqiDA9vqnsUSI6H+oAERp2HZ65qP/VIAWAFZQOCBCAAAA8AEAnQEqEAAIAAVAfCWkAALp8sF8rgRgAP7o9FDvMCkMde9PK7euH5M1m6VWoDXf2FkP3BqV0ZYbO6NA/VFIAAAA
#   alt: Responsive rendering of Chirpy theme on multiple devices.
---

### Project Overview

This project serves as a complementary tool to the paper _"Towards Motion Metamers for Foveated Rendering"_ by Taimoor Tariq and Piotr Didyk [^1]. 

**Foveated rendering** is a technique used in computer graphics to optimize rendering performance by reducing the quality of images in peripheral vision areas, where human perception is less sensitive. However, this can lead to a loss of motion perception, as the reduced quality can make it difficult for our peripheral vision to detect the hints of motion that it relies on when estimating velocity. 

*Foveated rendering* is based on the concept of **spatial metamers**, which are images that are perceptually indistinguishable from a reference image when viewed under certain conditions. The paper further introduces the idea of **motion metamers**, which, aside from being *spatially* indistinguishable from the reference image, also capture the same *motion perception* cues as the reference image.

This project guides users through the steps required to set up an illusion similar to that presented in the paper, only applied to a static image. I developed the project in Godot due to its lightweight yet powerful design, accessible scripting language, and its free and open-source nature.

During my presentation of the paper in our university's CGV seminar, one key piece of positive feedback I received was how breaking the illusion into smaller, focused steps made the concepts and reasoning behind it easier to follow. This project is built around that idea, guiding users through a series of interactive scenes, each highlighting the effect of a specific parameter on Gabor patches.

To keep the project manageable and interactive, I simplified certain aspects by reducing the complexity of the calculations or by allowing users to manually adjust values. These changes slightly weaken the resulting illusion of motion, but they enhance user understanding and engagement.

### Scene Structure:

Godot bases itself on a scene system, where each scene can be thought of as a collection of nodes, which can be anything from a simple sprite to another scene. In this project, I split the illusion into several scenes, each focusing on a specific aspect of the illusion. The scenes are as follows:

1. **Patch Toy**  
   This first scene is meant as a playground for the user, where they get to define Gabor patches and their movement across the screen, in order to recreate various possible illusions. The paper authors themselves got the main idea behind motion metamers via Gabor patches from the "Double Drift" illusion, so this playground scene serves as a way for users to interactively explore and understand that illusion.

2. **Sampling**  
   This scene aims to showcase how the paper authors generate locations to convolve with their Gabor patches. While this part could be left out, and patch locations could be generated automatically, I decided to include it such that the user can interact with every step of the process of generating the illusion.

3. **Orientation**  
   The orientation of the Gabor patches is decided by the underlying motion of the input video, which is obviously unavailable to us when working with a static image. Instead, I chose to always aim the motion away from the mouse cursor, as if the user is always moving forward toward their gaze (in this case approximated by the mouse cursor). This allows the user to visualize how patch orientation would change with motion direction.

4. **Frequency**  
   While in the original paper, the authors determine the frequency of each patch based on a contrast sensitivity function, I chose to simplify this part of the calculation and approximate it by linearly interpolating between a minimum and maximum frequency, based on eccentricity.

5. **Amplitude**  
   Instead of dynamically calculating amplitude based on the underlying image contrast values, I chose to allow the user to use a slider to set amplitude. This allows the user to visualize the effect of amplitude on the appearance of a patch, while also simplifying my work.

6. **Phase Change Rate**  
   Another simplification was needed for this scene, as we assume constant motion throughout the image. I provide the user with a velocity slider, which controls the magnitude of the induced motion. This allows the user to view how the phase change rate should act based on different velocity targets.

7. **Combined Mode**  
   This scene showcases the illusion in full effect, while also giving the user control over all previously available parameters. Thus, the user can fine-tune the illusion to achieve and observe their desired effect.

### Source Code

This project is open-source and available on my GitHub page: [Gabor Patch Toy](https://github.com/MBernevig/gabor_patch_toy).

[^1]: Tariq, T., & Didyk, P. (2024). _Towards Motion Metamers for Foveated Rendering_.
