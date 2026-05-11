//
//  CoachWidgetLiveActivity.swift
//  CoachWidget
//
//  Created by Jorge Alvarez Pinto on 11-05-26.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct CoachWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct CoachWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CoachWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension CoachWidgetAttributes {
    fileprivate static var preview: CoachWidgetAttributes {
        CoachWidgetAttributes(name: "World")
    }
}

extension CoachWidgetAttributes.ContentState {
    fileprivate static var smiley: CoachWidgetAttributes.ContentState {
        CoachWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: CoachWidgetAttributes.ContentState {
         CoachWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: CoachWidgetAttributes.preview) {
   CoachWidgetLiveActivity()
} contentStates: {
    CoachWidgetAttributes.ContentState.smiley
    CoachWidgetAttributes.ContentState.starEyes
}
