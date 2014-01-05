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

kill_thread = False
kill_queue = False

def read_queue(q):
    global kill_queue
    while True and not kill_queue:
        sys.stdout.write(q.get().decode('ascii', 'ignore'))


def read_line(source, q, init):
    global kill_thread
    while True and not kill_thread:
        for line in source.stdout:
            q.put(line)
    kill_thread = False


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

        global kill_thread

        filename = event.name.split(os.path.sep)[-1]

        if '.' not in filename:
            return

        name, extension = filename.split('.')

        if extension == 'scss':
            print('\nChanged file: ' + event.name)
            print(css_init)
            cwd = os.getcwd()

            os.chdir(os.sep.join((cwd, 'static')))
            with Popen(['compass', 'compile', 'sass/main.scss'], stdout=PIPE) as f:
                os.chdir(cwd)
                f.wait()
                for line in f.stdout:
                    sys.stdout.write(line.decode('ascii', 'ignore'))

        if extension in ['js', 'html', 'jade']:
            print('\nChanged file: ' + event.name)
            print(node_init)
            node_server.kill()
            node_server = run_server()

            # Kill current thread: t
            kill_thread = True
            while kill_thread: None
            kill_thread = False

            t = run_thread()
            t.start()

        if extension == 'py':
            print('\nManually restart the plugin...')
            sys.exit(1)

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
