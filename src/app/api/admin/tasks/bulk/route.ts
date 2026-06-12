import { NextResponse } from 'next/server';
import dbConnect from '@/src/lib/dbConnect';
import Task from '@/src/models/Task';
import Module from '@/src/models/Module';

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const {
            moduleId,
            tasks
        } = body;

        if (!Array.isArray(tasks)) {
            return NextResponse.json({
                success: false,
                message: "tasks array olmalıdır"
            }, { status: 400 })
        }

        const orders = tasks.map(
            (t: any) => t.order
        );

        const exists = await Task.find({
            moduleId,
            order: {
                $in: orders
            }
        });

        if (exists.length) {
            return NextResponse.json({
                success: false,
                message:
                    "Eyni order artıq mövcuddur"
            }, { status: 400 })
        }


        const prepared = tasks.map(
            (t: any) => ({
                ...t,
                moduleId
            })
        );

        const created =
            await Task.insertMany(prepared);

        await Module.findByIdAndUpdate(
            moduleId,
            {
                $push: {
                    tasks: {
                        $each:
                            created.map(t => t._id)
                    }
                }
            }
        );

        return NextResponse.json({
            success: true,
            count: created.length,
            data: created
        });

    } catch (error: any) {

        return NextResponse.json({
            success: false,
            message: error.message
        }, { status: 400 })

    }

}