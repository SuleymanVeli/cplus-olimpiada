import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Topic from '@/models/GameTopic';
import Level from '@/models/GameLevel'; // Level modelini import edirik

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Aggregation pipeline vasitəsilə mövzuları çəkirik və 
    // hər mövzuya aid levelləri 'levels' massivi olaraq içinə qoyuruq
    const roadmap = await Topic.aggregate([
      {
        $sort: { order: 1 } // Əvvəlcə mövzuları sıralayırıq
      },
      {
        $lookup: {
          from: 'gamelevels', // MongoDB-dəki 'Level' kolleksiyasının tam adı (adətən kiçik hərflə və cəmdə olur)
          localField: '_id',  // Topic sənədindəki ID
          foreignField: 'topicId', // Level sənədindəki əlaqəli sahə
          as: 'levels' // Hansı adla massiv olaraq gəlsin
        }
      },
      {
        $addFields: {
          // Hər mövzunun daxilindəki levelləri də öz daxilində 'order'-ə görə sıralayırıq
          levels: {
            $sortArray: { input: "$levels", sortBy: { order: 1 } }
          }
        }
      }
    ]);

    return NextResponse.json({ games: roadmap}, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}