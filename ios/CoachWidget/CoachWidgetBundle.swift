//
//  CoachWidgetBundle.swift
//  CoachWidget
//
//  Created by Jorge Alvarez Pinto on 11-05-26.
//

import WidgetKit
import SwiftUI

@main
struct CoachWidgetBundle: WidgetBundle {
    var body: some Widget {
        CoachWidget()
        CoachWidgetControl()
        CoachWidgetLiveActivity()
    }
}
