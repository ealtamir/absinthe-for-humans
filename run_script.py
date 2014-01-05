#! /usr/local/bin/python3

import os
import sys
import signal

from threading import Thread
from queue import Queue

from subprocess import Popen
from subprocess import PIPE

from fsevents import Observer
from fsevents import Stream


def read_queue(q):
    while True:
        sys.stdout.write(q.get().decode('ascii', 'ignore'))


def read_line(source, q, init):
    while True:
        for line in source.stdout:
            q.put(line)


def create_cb():
    node_init   = '\n====================> Restarting Server\n'
    css_init    = '\n====================> Compiling CSS\n'

    def run_server():
        return Popen(['node', 'app.js'], stdout=PIPE, bufsize=-1)

    def run_thread():
        return Thread(target=read_line,
                      args=(node_server, q, node_init), daemon=True)


    # Start queue
    q = Queue()
    q_t = Thread(target=read_queue, args=(q,), daemon=True)
    q_t.start()

    # Start server and stdout listeners
    node_server = run_server()
    t = run_thread()
    t.start()

    def callback(event):
        nonlocal node_server
        nonlocal t
        nonlocal node_init

        filename = event.name.split(os.path.sep)[-1]

        if '.' not in filename:
            return

        name, extension = filename.split('.')

        if extension == 'js':
            print('\nChanged file: ' + event.name)
            node_server.kill()
            print(node_init)
            node_server = run_server()
            t = run_thread()
            t.start()

        elif extension == 'scss':
            print('\nChanged file: ' + event.name)
            print(css_init)
            cwd = os.getcwd()

            os.chdir(os.sep.join((cwd, 'static')))
            with Popen(['compass', 'compile', 'sass/main.scss'], stdout=PIPE) as f:
                os.chdir(cwd)
                f.wait()
                for line in f.stdout:
                    sys.stdout.write(line.decode('ascii', 'ignore'))

        else:
            None

    return callback


def start_session():
    observer = Observer()
    observer.start()

    cb = create_cb()

    stream = Stream(cb, os.getcwd(), file_events=True)
    observer.schedule(stream)
    observer.run()

if __name__ == '__main__':
    print('Starting run script...\n')
    start_session()
