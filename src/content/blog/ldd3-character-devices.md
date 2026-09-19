---
title: "LDD3：字符驱动设备"
description: "记录字符设备的主次设备号、注册、file_operations、cdev 与设备节点等核心概念。"
published: 2025-08-11
updated: 2025-08-11
category: "Linux 驱动开发"
tags: ["Linux", "驱动开发", "LDD3", "字符设备", "cdev"]
---

### 1. 主次设备号

​	在2.6中，对字符设备的访问使用过文件喜用内的设备名称进行的。 这些名称被称为特殊文件，设备文件，或者简单的称之为文件系统树的结点，它们通常位于/dev目录。 

​	通常，主设备号用来标识**对应的驱动程序**。次设备号用于正确确定**设备文件所指的设备**。看着可能有些难以理解，主设备号对应的就是**驱动程序的本身**，或者说是“**设备类型**”。而次设备号对应的就是**驱动程序管理的具体设备实例**。

​	只要这些设备都由同一个驱动程序控制，它们就可以共享**同一个主设备号**，但每个设备会有**不同的次设备号**。一个驱动程序可以通过不同的次设备号，管理多个同类设备。

​	在内核中，`dev_t` 只是一个 **typedef** 出来的 **无符号 32 位整数**，用来存放“主号 + 次号”的**位段组合**。**高 12 位** 存放主设备号（Major）。**低 20 位** 存放次设备号（Minor)。`include/linux/types.h`中定义如下：

```c
typedef u32 __kernel_dev_t;
typedef __kernel_dev_t          dev_t;
```

有两个专用的宏定义来从`dev_t`获得设备号和将其转换为`dev_t`：

```c
#define MINORBITS   20
#define MINORMASK   ((1U << MINORBITS) - 1)					// 将无符号1左移20位-1得到0X000F FFFF 即低20位全1

#define MAJOR(dev)  ((unsigned int)((dev) >> MINORBITS))	// 位运算，右移20位得到前12位 
#define MINOR(dev)  ((unsigned int)((dev) &  MINORMASK))	// 或上掩码，得到低20位
#define MKDEV(ma,mi) (((ma) << MINORBITS) | (mi))
```



* 获得和释放设备号

​	在建立一个字符设备之前，驱动程序首先要做的就是获得一个或者多个设备号。申请设备号分为静态和动态。

​	静态申请在驱动开发者提前知道(或自己指定)一个设备号，并告诉内核：“我要从 major=X、minor=Y 开始，连续拿 N 个号，请留给我。”内核只做**冲突检查**；如果该区间已被占用直接返回 `-EBUSY`。接口如下：

`int register_chrdev_region(dev_t first, unsigned count, const char *name);`

`first` 由 `MKDEV(major, first_minor)` 拼好，是要分配设备编号范围的起始值。`count`顾名思义是所请求的连续设备编号的个数（就是次设备号的个数）。`name`是和编号范围关联的设备名称，会出现在虚拟文件系统/proc/devices和sysfs中。

​	而在我们**不提前明确主设备号**的情况下（这是大多数），那我们应该使用：

`int alloc_chrdev_region(dev_t *dev, unsigned baseminor,unsigned count, const char *name);`

成功时内核把选到的 `dev_t` 写回 `*dev`,`baseminor` 只是“起始次设备号”，一般填 0。其余语义同上。

在动态分配设备号时，我们自然是 **不能**保证我们分配的主设备号始终一致，所以无法预先的创建设备节点。创建设备节点这一件事在新版内核中交给udev和设备树。

无论静态还是动态，卸载模块时都要**对称调用**：

`void unregister_chrdev_region(dev_t from, unsigned count);`

​	在LDD3中作者说：“分配主设备号的最佳方式是：默认采用动态分配，同时保留在加载甚至是编译时指定主设备号的余地，用一个全局变量保存所选择的设备号，可以在头文件来设置这个设备号，如设0既是“**选择动态分配**”，这样就可以在编译前修改宏定义来选择什么方法获得设备号。“形如如下代码：

```c
 if (scull_major) {
        dev = MKDEV(scull_major, scull_minor);
        result = register_chrdev_region(dev, scull_nr_devs, "scull");
    } else {
        result = alloc_chrdev_region(&dev, scull_minor, scull_nr_devs,
               "scull");
        scull_major = MAJOR(dev);
    }
    if (result < 0) {
       printk(KERN_WARNING "scull: can't get major %d\n", scull_major);
       return result;
```

###  2.文件操作

注册了设备号，我么完成了驱动程序代码必须完成的工作中的第一步。

这些函数值是为驱动程序分配了设备编号，但是没告诉内核关于拿来这些编号要做什么。现在我们空有设备编号，但是尚未将任何驱动程序连接到这些编号。

- file_operations

`file_operations`结构用来建立这个连接。在万物皆文件的linux中，`file_operations` 是 Linux 字符/块设备驱动、文件系统、内核子系统都要打交道的一张“**回调函数表**”。每个打开的文件，都要和这么一组函数关联。驱动程序把“用户对文件能做的所有动作”映射成“内核里对应的函数指针”。
用户空间 `open/read/write/ioctl/close/mmap/poll/...` 最终都会调到这张表里你实现的钩子。

这个结构中的每个字段，都指向驱动程序中实现特定操作的函数，对于不支持的操作，可以置为NULL，但是内核对这些null的处理不尽相同。p54-56总结了这些方法，这里不多赘述,列出一些常用的,建议配合unix环境高级编程食用。

```c
static const struct file_operations demo_fops = {
    .owner          = THIS_MODULE,//告诉内核：当该文件还在被进程打开时，禁止 rmmod 卸载本模块，避免“函数指针悬空”。
    .open           = demo_open,
    .release        = demo_release,
    .read           = demo_read,
    .write          = demo_write,
    .unlocked_ioctl = demo_ioctl,
    .llseek         = demo_llseek,
    .poll           = demo_poll,
    .mmap           = demo_mmap,
};
```

`file_operations` 就是内核给你的一张 **“文件操作清单”**，把它填好、挂到 `cdev`，用户空间的所有文件 API 便自动落到你写的钩子函数上。

当结构挂到设备上后，用户 `open("/dev/mydev", ...)` 就会调到 `demo_open()`。

* file结构

这里的file和用户空间程序中的FILE没有任何关联，这里的`struct file`是一个内核结构，代表一个打开的文件（不限于驱动程序，系统中每个打开的文件都在内核空间中有一个对应的file结构）。它由内核在open时创建，并传递在该文件上进行的所有函数，直到最后的`close`函数。在文件的所有实例都被关闭之后，内核才会释放这个数据结构。`filp`是指向`file`结构的指针。

这里展示一部分的file结构:

```c
#include <linux/fs.h>

struct file {
    /* 1. 通用字段 */
    union {
        struct llist_node   fu_llist;   /* 文件关闭延迟释放链表 */
        struct rcu_head     fu_rcuhead;
    } f_u;

    struct path          f_path;        /* dentry + mount 信息 → 找到 inode */
    const struct file_operations *f_op; /* 指向驱动提供的 file_operations */
    spinlock_t           f_lock;        /* 保护下面的状态字段 */
    atomic_long_t        f_count;       /* 引用计数：dup()/fork() 会加一 */
    unsigned int         f_flags;       /* O_RDONLY|O_NONBLOCK|O_SYNC|... */
    fmode_t              f_mode;        /* FMODE_READ / FMODE_WRITE 许可 */
    loff_t               f_pos;         /* 当前文件偏移量，lseek()/read() 更新 */
    struct fown_struct   f_owner;       /* SIGIO 异步通知用 */
    const struct cred    *f_cred;       /* 打开者权限 */
    void                 *private_data; /* 驱动随意挂私有指针，生命周期同 file */
    
    /* 2. 缓存 & 状态 */
    struct address_space *f_mapping;    /* 页缓存映射 */
    struct mutex         f_pos_lock;    /* 保护 f_pos 并发修改 */
    
    /* 3. epoll/poll 相关 */
    struct hlist_head    f_ep_links;    /* epoll 监听链表 */
    struct list_head     f_tfile_llink; /* 用于 timerfd/eventfd */
    
    /* 4. 其他可选字段：sendfile/splice、lease、lock 等 */
    ...
};
```

驱动程序从自己填写file结构，而只是对别处创建的file结构进行访问。`struct file` 就是“**一个打开的文件描述符在内核里的化身**”；驱动通过它记录/传递“**这一次会话**”的所有现场信息，并确保多进程、多次打开互不干扰。

* inode结构

内核用`inode`结构在内部表示文件，因此它和`file`不同，`file`是表示打开的文件描述符。对于单个文件，可能会有多个表示打开的文件描述符的`file`结构，但他们都指向单个inode结构。

`struct inode` 是 Linux 内核中**“文件本体”**（而非一次打开会话）的核心元数据结构。一句话：**只要文件存在，就有且仅有一个 inode；它被所有 `struct file` 共享，保存“文件是谁、什么样、存在哪”**。忘了哪里有个图描述的很清楚，关于文件管理的，好像是unix环境高级编程，回头找出来插上。

虽然`inode`包含了大量信息，但是在对驱动程序只关心下面几个：

| 字段        | 用途示例                                                     |
| ----------- | ------------------------------------------------------------ |
| `i_rdev`    | 字符/块设备节点：表示设备文件的inode结构 ,保存主/次设备号；驱动通过 `iminor(inode)`/`imajor(inode)` 宏提取。 |
| `i_cdev`    | 字符设备：注册 `cdev_add()` 后，内核把 `struct cdev *` 挂到 `inode->i_cdev`，`open()` 时就能取回自己的设备结构体。 |
| `i_size`    | 普通文件：驱动若实现内存文件可随意修改；块设备文件通常由文件系统维护。 |
| `i_private` | 文件系统私有数据；debugfs、procfs 常用。                     |

`struct inode` = **文件系统层面的“身份证”**；
它记录了“文件是谁、有多长、权限、时间戳、设备号”等**静态属性**，供所有进程的所有打开会话共享，而真正的“打开会话状态”则放在 `struct file` 里。



### 3.开始写字符驱动

了解上面那么多了，我们也该开始我们的字符驱动了。

* cdev结构体

​	cdev（**character device** 的缩写）是 Linux 内核里“**字符设备对象**”的**最小、最核心**数据结构。他的作用就是**将设备号联系到驱动实现的`file_operations`,让内核在open/write/read的时候可以立即找到对应的函数回调**。结构体如下：

```c
#include <linux/cdev.h>

struct cdev {
    struct kobject   kobj;        /* 内嵌 kobject，用于 sysfs 与引用计数 */
    struct module   *owner;       /* 指向所属模块，防止 rmmod 时模块被卸载 */
    const struct file_operations *ops; /* 驱动实现的回调表 */
    struct list_head list;        /* 挂到全局字符设备链表 */
    dev_t            dev;         /* 起始设备号（major/minor）*/
    unsigned int     count;       /* 连续次设备号个数 */
    ...
};
```

​	关于注册字符设备的api：

| 阶段              | API                           | 作用                                                         |
| ----------------- | ----------------------------- | ------------------------------------------------------------ |
| 初始化            | `cdev_init(cdev, fops)`       | 把 `file_operations` 绑到 cdev 上                            |
| 加入内核          | `cdev_add(cdev, dev, count)`  | 告诉内核：设备号 `dev` 起 `count` 个次号，由 `cdev->ops` 服务 |
| 移除              | `cdev_del(cdev)`              | 从内核字符设备表中摘除，防止再被 open                        |
| 分配/释放（可选） | `cdev_alloc()` / `cdev_put()` | 动态申请/释放 `struct cdev`（很少直接用，多数静态或嵌入自定义结构体） |

​	使用，将设备号和fops关联起来，并且通知内核。

```c
/*
 * Set up the char_dev structure for this device.
 */
static void scull_setup_cdev(struct scull_dev *dev, int index)
{
	int err, devno = MKDEV(scull_major, scull_minor + index);
    
	cdev_init(&dev->cdev, &scull_fops);
	dev->cdev.owner = THIS_MODULE;
	err = cdev_add (&dev->cdev, devno, 1);
	/* Fail gracefully if need be */
	if (err)
		printk(KERN_NOTICE "Error %d adding scull%d", err, index);
}

```



* 经典方法

- - open方法

​	open ，顾名思义，是打开什么。open之前，内核完成了完成了“文件描述符 + inode + file 结构体”的准备工作。注意这个file是设备文件，当file->f_op->open(inode, file)时，第一次进入了驱动中，相当于对驱动做一个“打开操作”，实际是在打开前做检查，并将设备结构挂在到file->private_data中，open() 的作用不是“再打开一次文件”，而是**“完成设备初始化并让文件与设备实例真正关联”**，成功后返回0，表示设备真正可用。

LDD3中的说法:

1. 检查设备特定的错误
2. 如果设备时首次打开，则对其进行初始化
3. 如有必要，更新f_op指针
4. 分配并填写置于filp->private_data里的数据

​	方法原型：`int (*open)(struct inode *inode, struct file *file);`

在inode参数中的`i_cdev`字段中包含着我们需要的信息，即字符设备在注册后，内核把 `struct cdev *` 挂到 `inode->i_cdev`。但是我们通常并不需要cdev结构的本身，希望的得到包含cdev的scull_dev结构。在<linux/kernel.h>中有个宏：

```c
#define container_of(ptr, type, member) ({              \
    const typeof(((type *)0)->member) * __mptr = (ptr); \
    (type *)((char *)__mptr - offsetof(type, member));  \
})

container_of(pointer, container_type, container_filed);
```

这个宏的作用就是从结构体的 成员指针倒退结构体的首地址。工作原理（分两步）：

1. `offsetof(type, member)`
   求出成员 `member` 在结构体中的**字节偏移量**。
   内核定义：`#define offsetof(TYPE, MEMBER) ((size_t)&((TYPE *)0)->MEMBER)`
2. 用成员地址 **减去** 该偏移量 → 得到**结构体起始地址**。

`container_filed`就是我们需要的成员指针的字段类型，`container_type`就是结构体的类型，而pointer就是那个成员指针。我们从`pointer`中到推出结构体的首地址返回一个指针。典型场景就是`file->private_data `指向 `cdev`，反推出 `my_device `。形象的说就是**由子及父**。

**cdev 本身就是设备结构体里的一个成员**，而 `container_of` 宏做的就是“**从成员地址倒推整个结构体首地址**”。

​	`container_of(ptr, type, member)` 的内部实现：	

```c
	(type *)((char *)(ptr) - offsetof(type, member))
```

- `ptr` 是 `inode->i_cdev`——也就是 `&my_dev->cdev` 的地址。
- `offsetof(struct my_device, cdev)` 给出 `cdev` 在 `struct my_device` 里的**字节偏移**。
- 二者相减就得到 `struct my_device` 的首地址。

​	在找到这个结构后，我们就可以将指针保存到file结构的private_data结构中，方便以后丢该指针的访问。

LDD3中给出了scull_open的示例代码。

```c
238int scull_open(struct inode *inode, struct file *filp)
239{
240    struct scull_dev *dev; /* device information */
241
242    dev = container_of(inode->i_cdev, struct scull_dev, cdev);
243    filp->private_data = dev; /* for other methods */
244
245    /* now trim to 0 the length of the device if open was write-only */
246    if ( (filp->f_flags & O_ACCMODE) == O_WRONLY) {
247        if (down_interruptible(&dev->sem))	// 锁 
248            return -ERESTARTSYS;
249        scull_trim(dev); /* ignore errors */
250        up(&dev->sem);
251    }
252    return 0;          /* success */
253}
```



* release方法

```c
int (*release)(struct inode *inode, struct file *file);
```

它在内核中的调用时机是 **“最后一次 close() 把引用计数降到 0”** 时触发，与驱动 `open()` 成对出现。
核心职责：**把 open() 里申请/占用的资源全部归还，让设备回到“可被再次打开”的状态**。

```c
用户 close(fd)                 /* 可能有 dup、fork 导致多个 fd 指向同一 file */
 ↓  fput()
 ↓  if (atomic_long_dec_and_test(&file->f_count))
        file->f_op->release(inode, file);
```

与close的区别

| 项目     | 用户 close()       | 驱动 release()                   |
| -------- | ------------------ | -------------------------------- |
| 何时执行 | 每个 fd 关闭都执行 | **仅当 file 结构最后一次被释放** |
| 所在空间 | 系统调用           | 驱动回调                         |
| 作用     | 释放 fd 表项       | 释放设备资源                     |

驱动 `release()` = **“open() 的逆过程”**
把申请的中断、DMA、GPIO、时钟、锁、内存全部归还，让设备回到“干净、可再次打开”的状态。



* read和write

​	驱动层的 `read` 和 `write` 并不是把数据真的搬进搬出“磁盘”，而是把 **用户进程 buffer ↔ 内核空间 buffer ↔ 设备寄存器/DMA 区域** 之间的数据搬来搬去。
它们都属于 `struct file_operations`:

```c
ssize_t (*read)  (struct file *, char __user *buf, size_t count, loff_t *pos);
ssize_t (*write) (struct file *, const char __user *buf, size_t count, loff_t *pos);
```

| 方向            | 宏                            | 作用                 |
| --------------- | ----------------------------- | -------------------- |
| 读：内核 → 用户 | `copy_to_user(to, from, n)`   | 失败返回 **-EFAULT** |
| 写：用户 → 内核 | `copy_from_user(to, from, n)` | 失败返回 **-EFAULT** |

驱动层的 `read/write` 就是：
**把用户缓冲区搬到内核，再把内核缓冲区搬到设备寄存器（或反之）**
期间处理好 **并发、内存拷贝、阻塞/非阻塞、EOF** 即可。

