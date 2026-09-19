---
title: "Yocto：树外模块整理"
description: "梳理 Yocto 中树外内核模块的 recipe、设备树、固件、自动加载与镜像集成流程。"
published: 2026-04-26
updated: 2026-04-26
category: "Linux 驱动开发"
tags: ["Linux", "驱动开发", "Yocto", "内核模块", "BitBake"]
---

## 一、思路

* Linux源码树内移植

在我们正常往内核中添加一个module 的时候，一般是找到对应的子系统，在其中添加驱动，没有子系统的就塞到杂项驱动misc中去。而做嵌入式linux驱动移植的思路基本上是：

1. 保证有一个能用的驱动
   -	有厂商提供驱动，使用厂商驱动。
   -	没有厂商提供驱动的，有datasheet, 搓一个可以用的驱动。
2. 按照datasheet中的信息，配置好设备树,以及所需要用到的引脚。

   -	自己写好dtsi,引到当前板子使用的设备树中。
   -	直接在使用的设备树中进行修改。

3. 将其加入到内核编译中

   -	-y编进内核镜像，驱动随着内核一起加载，最后进入到vmlinux。

   -	-m变成内核模块，生成ko文件。运行时可用 insmod/modprobe 加载，也可卸载。


后面即开机观察驱动是否正常挂载，probe是否成功，驱动功能是否正常。

* YOCTO树外模块移植

在yocto linux 项目中，一般将需要加的驱动作为树外模块。一般将其作为一个独立的recipe，不塞进内核树里。思路上和树内移植区别不大，不过确实多了许多步骤。思路大概如下：

1. 保证有一个能用的驱动，确保这个驱动和他的makefile能够编出ko。

   -	有厂商提供驱动，使用厂商驱动。

   - 没有厂商提供驱动的，有datasheet, 搓一个可以用的驱动。

1. 配置好所需要用的引脚,给权限.

2. 自己建一个layer,或者整个产品附加的所有驱动建一个layer.
3. 建一个recipes,一般来说驱动放在recipes-kernel下.写好bb,定义好源码路径和编译规则以及自动加载.
4. 移植设备树,看编译的选择基本上分为:

   -	打patch,直接给内核设备树打patch.写bbappend

   -	新编一个dtbo,构建时合并成最终的DTB,多用于子系统.写bb.
5. 把模块装进镜像.

后面也是一样,开机观察驱动是否正常挂载，probe是否成功，驱动功能是否正常。




# 二、yocto 树外模块移植总览

一个外设驱动要移植的东西,通常可以拆成三类内容：**驱动本体,设备树,固件**.在yocto中基本上对应以下的recipes

| 内容     | Yocto 常见归属                        | 输出位置或效果                                  |
| -------- | ------------------------------------- | ----------------------------------------------- |
| 驱动源码 | recipes-kernel /<driver>/<driver>.bb  | 编译生成 .ko，安装到 rootfs 的 /lib/modules/... |
| 固件文件 | recipes-bsp /<firmware>/<firmware>.bb | 安装到 rootfs 的 /lib/firmware/...              |
| 设备树   | kernel DT patch 或外置 .dtbo recipe   | 进入最终 DTB/DTBO/dtbo.img                      |


推荐把这三类内容放在同一个自定义 layer 中，例如：
```bash
meta-hello/
├── conf/layer.conf
├── recipes-kernel/
│ ├── hello/
│ │ ├── hello.bb
│ │ └── files/hello/...
│ └── linux-msm/
│ ├── linux-msm_x.xx.bbappend
│ └── files/0001-arm64-dts-hello.patch
├── recipes-bsp/
│ └── hello-firmware/
│ ├── hello-firmware.bb
│ └── files/*.bin
└── recipes-products/
 └── images/xxx-xxxxxx-image.bbappend
```


# 三、创建自定义层

在实际的项目中，当我们`source`后都会进入到`build`目录，在此目录下可以使用`bitbake`命令，这个命令就可以帮我们新建一个自定义层:

```shell
source xx/build.sh
bitbake-layers create-layer ../meta-mycustom
```

一般当我们整编的时候，高通基线的编译脚本基本上会自动扫描重新生成bblayers.conf。脚本里面没有的话或者是其他修改就自己在脚本里加一下，不过也不用下面的这种方法，所以我们一般不用再多余的加一步。

```shell
bitbake-layers add-layer ../meta-mycustom
```

而是在编译脚本中添加`export EXTRALAYERS="your layers"`

bblayers.conf 告诉 BitBake 当前构建要使用哪些 **layer**。BitBake 启动时会读取 bblayers.conf 里的 BBLAYERS，然后去每个 layer 里找：

```bash
conf/layer.conf
```

再根据这些 layer 提供的 .bb、.bbappend、conf、classes 等内容完成构建。

执行完以上命令后，我们的自定义层就创建好了。其结构如下:

```bash
.
├── COPYING.MIT
├── README
├── conf
│   └── layer.conf
└── recipes-example
    └── example
        └── example_0.1.bb
```



# 四、添加驱动模块

​	这和我们一般的直接在内核中添加驱动并不一样。树外模块，顾名思义是指独立于内核源码树的外部内核模块。

​	在传统的安卓/linux项目中，一般就是添加驱动源码，修改makefile/Kconfig/kbuild，使之接入到内核的编译中。

​	在yocto中，则是将这一举动抽离出来，当然我觉得形式上也是大同小异，只是不放在内核的源码树上了，可以独立管理。做法也很简单：

1. 在自建layer下创建一个新的配方，我们的驱动基本上都是放到内核中的，所以取名recipes-kernel即可。
2. 在下面创建一个独立的文件夹，比如驱动叫啥我叫啥。
3. 创建独立文件夹`files`，放你的驱动源码以及`makefile`,或者直接在bb中定义好源码路径.
4. 写一个bb,将其编译位ko，并且开机自动加载
5. 写一个bbapend，将其加载到镜像中。

​	简单吧！你只需要完成这五步，就可以收获一个树外模块。

​	第一步和第二步忽略忽略，第三步也忽略忽略，基本上有可以编译为模块的代码和`makefile`.

​	那接下来就是第四步：写一个bb。啊~这个bb是什么？用人话说就是配方文件，bitbake会拿到这个配方文件，根据其中的内容去操作。

​	比如：

```bb
SUMMARY = "Hello kernel module"
DESCRIPTION = "A simple out-of-tree Linux kernel module example"

# 分类，不影响编译，只是元数据
SECTION = "kernel/modules"

# 驱动模块通常用 GPL-2.0-only
LICENSE = "GPL-2.0-only"

# 使用 Yocto 自带的 GPL-2.0-only license 文件做校验
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/GPL-2.0-only;md5=cbac3ff40ef2b1e1e9a5f5f38a31d3ca"

# 关键：继承 module 类
# 它会帮你使用当前 Yocto 正在构建的 kernel headers / build tree 来编译 .ko
inherit module

PAKEAGE_ARCH= "{MACHINE_ARCH}"

DEPENDS += "virtual/kernel"

# 本地源码文件
# 默认会从当前 recipe 目录下的 files/ 目录查找
SRC_URI = " \
    file://Makefile \
    file://hello.c \
"

# 源码解压/拷贝后的工作目录
# 对本地 file:// 文件，通常就是 ${WORKDIR}
S = "${WORKDIR}"

# 如果 Makefile或者kbuild里模块名是 hello.o，
# 最终会生成 hello.ko，Yocto 会自动拆出 kernel-module-hello 包
#
# 这个 RPROVIDES 的作用是：
# 让安装 hello-kmod 时，也能满足 kernel-module-hello 这个包名
RPROVIDES:${PN} += "kernel-module-hello"

```

​	inherit module 会使用当前的Yocto kernel的构建环境编译模块，最终生成ko打包进rootfs。

​	而如果配置了：
```bb
	KERNEL_MODULE_AUTOLOAD += "hello"	
```

​	系统启动后会尝试自动加载模块。

​	这是最常见的做法，直接继承module类。而在一些厂商释放的基线中，他们会在bb中自定义do_compile，而不是直接继承module类，此时在bb中使用厂商释放的基线的编译方法，不然你编译出的ko在开机挂载的时候就会直接寄了。比如module类自定义使用的gcc编译器，而厂商释放基线的内核使用的是clang，那你的ko就会导致内核恐慌，直接挂掉。



# 五、添加设备树

​	设备树必须要参与kernel DTB/DTBO的构建或者参与boot image/dtbo image 的生成。

​	常见的方式有两种:

 	1. kernel DT patch
 	2. 外置dtbo



## 5.1 kernel DT patch

​	这种方式是把设备树的改动做成kernel recipe 的patch：

```text
meta-hello/
├── conf/layer.conf
├── recipes-kernel/
│ └── linux-msm/
│ ├── linux-msm_x.xx.bbappend
│ └── files/0001-arm64-dts-hello.patch
```

bbappend 示例：
```c
FILESEXTRAPATHS:prepend := "${THISDIR}/files:" 
SRC_URI:append:kalama = " \ 
    file://0001-arm64-dts-hello.patch;patchdir=../qcom/proprietary/devicetree \ "
```

## 5.2 外置 DTBO / techpack DTBO
在 QTI 平台中，很多外围模块会走 techpack DTBO 流程。基本思路是：单独编译一个 .dtbo，deploy 到 tech_dtbs，然后由 QTI image class 合并进最终 DT 产物。

目录示例：

```text
vendor/qcom/proprietary/hello-devicetree/
├── Makefile
└── hello-overlay.dts

meta-hello/
└── recipes-kernel/
    └── hello-devicetree/
        └── hello-devicetree_1.0.bb
```
recipe 示例：
```.bb
DESCRIPTION = "hello devicetree overlay"
LICENSE = "Qualcomm-Technologies-Inc.-Proprietary"

inherit linux-kernel-base deploy

PACKAGE_ARCH = "${MACHINE_ARCH}"

FILESPATH =+ "${WORKSPACE}/vendor/qcom/proprietary:"
SRC_URI = "file://hello-devicetree"

S = "${WORKDIR}/hello-devicetree"

DEPENDS += "virtual/kernel dtc-native"
do_configure[depends] = "virtual/kernel:do_shared_workdir"

hello_DTBO ?= "hello-overlay"

do_configure[noexec] = "1"

do_compile() {
    oe_runmake \
        CC="${BUILD_CC}" \
        DTC="${STAGING_BINDIR_NATIVE}/dtc" \
        KERNEL_INCLUDE="${STAGING_KERNEL_DIR}" \
        ${hello_DTBO}
}

do_deploy() {
    install -d ${DEPLOYDIR}/tech_dtbs
    install -m 0644 ${S}/*.dtbo ${DEPLOYDIR}/tech_dtbs/
}

addtask do_deploy after do_install

ALLOW_EMPTY:${PN} = "1"
```
overlay DTS 需要根据 base DT 是否已有节点选择写法。

如果 base DT 已经有 &hello，外置 overlay 可以只覆盖属性：
```
/dts-v1/;
/plugin/;

&hello {
    status = "okay";
};
```
如果目标是真正把设备树从 kernel 中抽离，base DT 不再有 hello，则外置 overlay 必须新增完整节点：
```
/dts-v1/;
/plugin/;

#include <dt-bindings/gpio/gpio.h>

放自己的设备树
```
这种方法一般适用与某个子系统，或者整个产品的放在一起。



## 5.3 可能会遇到的问题

1. DT patch 打上了但系统没生效

   常见原因：

   - 当前平台使用 prebuilt kernel/DT，patch 没有触发实际 DTB/DTBO 更新。

   - devicetree 拷贝 staging 的路径不对。

   - 最终刷机使用的不是本次构建生成的 dtbo.img。

2. 外置 DTBO 编译成功但没有进最终镜像
   - .dtbo 是否部署到 ${DEPLOY_DIR_IMAGE}/tech_dtbs。
   - BUILD_WITH_TECHPACKS = "1" 是否启用。
   - image class 是否执行 do_merge_techpack_dtbos。
   - hello-devicetree recipe 是否被 image 或依赖链拉入构建。

## 5.4 开机检查

有没有被编到？开机检查一下就知道了。

单纯检查设备树的几种方法：

```shell
1.导出当前运行中的 DTS
ls /proc/device-tree
ls /sys/firmware/devicetree/base

dtc -I fs -O dts /proc/device-tree > running.dts

2. 原始fdt存在
ls /sys/firmware/fdt

pull出来反编译

dtc -I dtb -O dts fdt > running.dts

```

反编译一下看一下自己的设备树节点有没有被编进去就知道了。一般来说ko编出来自动挂载没问题，但是没跑probe，就是设备树出现了问题。
