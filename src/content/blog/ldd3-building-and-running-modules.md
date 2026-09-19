---
title: "LDD3：构造和运行模块"
description: "从 Hello World 模块出发，记录 Linux 内核模块的编译、装载、卸载和运行时日志查看。"
published: 2025-08-05
updated: 2025-08-05
category: "Linux 驱动开发"
tags: ["Linux", "驱动开发", "LDD3", "内核模块", "Makefile"]
---

从hello world开始,写一个自己的驱动模块.代码如下:

```c
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>

MODULE_LICENSE("GPL");					// 许可证
MODULE_AUTHOR("GB");					// 作者
MODULE_DESCRIPTION("A Hello-World kernel module");

static int __init hello_init(void)		//在模块装载到内核的时候被调用,即insmod hello.ko的时候
{
    printk(KERN_ALERT "Hello, World!\n");
    return 0;          
}

static void __exit hello_exit(void)		//即remmod的时候
{
    printk(KERN_INFO "Goodbte, curel world!\n");
}

module_init(hello_init);				//通过这个宏来告诉内核模块装载时调用的函数
module_exit(hello_exit);				//模块卸载时调用的函数
```



分析这个简单的驱动代码,在分析一个驱动源码的时候,我们首先就要找是module_init和module_exit两个宏.这两个宏的参数分别是模块被装载是调用的函数和卸载时调用的函数.

所以对于hello.c，编译成模块后，装载模块时，hello_init函数就会被调用，打印了一句话“Hello,world”，卸载模块时，hello_exit函数就会执行，打印“Goodbye, cruel world”。

* 将其编译

在驱动模块中,我们使用makefile作为编译规则.而makefile怎么写呢?最简单的makefile只需要

`obj-m := hello.o`

这一句就可以,内核构造系统会为你处理其余问题.这个赋值语句说明了拥有一个模块需要从目标文件 hello.o 中构造,构造出的模块名为hello.ko.

而我们用的make命令则是:
```makefile
make -C /usr/src/linux-xxx(我们的内核) M=`pwd` modules
```

-C 后面跟的时是我们内核源码树所在的目录.M=后面表示把pwd命令执行的结果"即当前的路径"赋值给M. 

很明显,从上面的make命令之中,我们调用了内核源码树来编译这个模块,但?这是怎么做到呢?

这里make命令的”-C”选项，指定了内核源码树所在的路径，其中保存了Linux内核源码顶层Makefile，这个顶层Makefile即Linux内核编译系统的入口点。”M=”选项，表明在构造modules目标之前，返回到当前目录，即把要生成的modules目标放在当前目录下。

现在我们再来看这个makefile,” obj-m := hello.o”，这句话表明，当执行make modules命令时(这里忽略”-C”和”M=”选项)，要求从hello.o文件来生成一个目标模块，该目标模块名为hello.ko。

LDD3中给出了一个makefile模板

```makefile

# To build modules outside of the kernel tree, we run "make"
# in the kernel source tree; the Makefile these then includes this
# Makefile once again.
# This conditional selects whether we are being included from the
# kernel Makefile or not.

LDDINC=$(PWD)/../include
EXTRA_CFLAGS += -I$(LDDINC)

ifeq ($(KERNELRELEASE),)

    # Assume the source tree is where the running kernel was built
    # You should set KERNELDIR in the environment if it's elsewhere
    KERNELDIR ?= /lib/modules/$(shell uname -r)/build
    # The current directory is passed to sub-makes as argument
    PWD := $(shell pwd)

modules:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) modules

modules_install:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) modules_install

clean:
	rm -rf *.o *~ core .depend .*.cmd *.ko *.mod.c .tmp_versions *.mod modules.order *.symvers

.PHONY: modules modules_install clean

else
    # called from kernel build system: just declare what our modules are
    obj-m := hello.o hellop.o seq.o jiq.o sleepy.o complete.o \
             silly.o faulty.o kdatasize.o kdataalign.o jit.o
endif
```

首先我们分析一下这个LDD3(适配5.15版)给出的makefile.

`LDDINC` 指向 LDD3 示例共用的头文件目录（`../include`）。

`EXTRA_CFLAGS` 把该目录追加到每次编译内核模块时的头文件搜索路径，于是示例里的头文件等都能找到.

后面就是重要的二次调用了.

**第一次**在命令行执行 `make` 时，`KERNELRELEASE` 为空，进入 `ifeq ($(KERNELRELEASE),)` 分支；
这里负责调用内核的 kbuild 系统。

```makefile
 	# Assume the source tree is where the running kernel was built
    # You should set KERNELDIR in the environment if it's elsewhere
    KERNELDIR ?= /lib/modules/$(shell uname -r)/build
    # The current directory is passed to sub-makes as argument
    PWD := $(shell pwd)
```

这里给出了当前运行内核的构建目录,即KERNELDIR变量赋值,我们也可以用make KERNELDIR=/xxx覆盖.shell pwd就是运行shell命令,获取当前的路径,赋值给PWD.

然后进行第一次的modules:  这里的命令`$(MAKE) -C $(KERNELDIR) M=$(PWD) modules`,.执行这个命令时，”-C”选项决定了首先会调用内核构造系统(其中包括创建KERNELRELEASE变量)把当前目录当成“外部模块,然后内核构建系统的顶层makefile将此目录下的makefile include,再按照该makefile执行.

**第二次**被内核顶层 Makefile 再次 include 时，kbuild 已把 `KERNELRELEASE` 设为非空，于是跳到 `else` 分支，仅执行obj-m := hello.o。后面的过程就和我们前面介绍的最简单的只有一句话的Makefile一样.

整个过程只发生 **一次** make 进程，但 Makefile 被 **读/解析了两次**，所以看上去像“二次调用”。实际是**内核的 kbuild 系统** 在 **一次** 构建过程中 **主动把同一个 Makefile 又重新 include 了一次**.

